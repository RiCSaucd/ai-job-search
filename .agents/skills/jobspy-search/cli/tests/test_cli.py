"""Network-free unit tests for the jobspy-search CLI.

Everything here exercises pure functions: flag parsing, validation, the
DataFrame-row mapping, and rendering. No test touches the network or requires
python-jobspy to be installed, so this suite runs anywhere.

Run: python3 -m unittest discover -s .agents/skills/jobspy-search/cli/tests -t .
"""

import io
import json
import os
import sys
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import cli  # noqa: E402


def capture_stderr_json(fn, *args, **kwargs):
    """Run fn and return (result, parsed stderr JSON or None)."""
    buf = io.StringIO()
    with redirect_stderr(buf):
        result = fn(*args, **kwargs)
    raw = buf.getvalue().strip()
    return result, (json.loads(raw) if raw else None)


class TestParseFlags(unittest.TestCase):
    def test_long_and_short_flags_with_values(self):
        flags = cli.parse_flags(["search", "-q", "help desk", "--location", "Remote"])
        self.assertEqual(flags["_"], ["search"])
        self.assertEqual(flags["query"], "help desk")
        self.assertEqual(flags["location"], "Remote")

    def test_boolean_flag_has_no_value(self):
        flags = cli.parse_flags(["search", "--remote", "--limit", "5"])
        self.assertIs(flags["remote"], True)
        self.assertEqual(flags["limit"], "5")

    def test_dashes_in_flag_names_become_underscores(self):
        flags = cli.parse_flags(["search", "--easy-apply", "--job-type", "fulltime"])
        self.assertIs(flags["easy_apply"], True)
        self.assertEqual(flags["job_type"], "fulltime")

    def test_positionals_accumulate(self):
        flags = cli.parse_flags(["detail", "4426311357"])
        self.assertEqual(flags["_"], ["detail", "4426311357"])


class TestParseIntFlag(unittest.TestCase):
    def test_valid_integer(self):
        self.assertEqual(cli.parse_int_flag("limit", "12"), 12)

    def test_zero_is_valid_not_falsy_rejected(self):
        self.assertEqual(cli.parse_int_flag("jobage", "0"), 0)

    def test_non_numeric_reports_bad_arg(self):
        value, err = capture_stderr_json(cli.parse_int_flag, "limit", "abc")
        self.assertIsNone(value)
        self.assertEqual(err["code"], "BAD_ARG")


class TestNormalizeSites(unittest.TestCase):
    def test_default_is_indeed_and_linkedin(self):
        sites, err = cli.normalize_sites(None)
        self.assertIsNone(err)
        self.assertEqual(sites, ["indeed", "linkedin"])

    def test_comma_list_is_split_and_lowercased(self):
        sites, err = cli.normalize_sites("Indeed, ZIP_RECRUITER")
        self.assertIsNone(err)
        self.assertEqual(sites, ["indeed", "zip_recruiter"])

    def test_unknown_site_is_rejected(self):
        sites, err = cli.normalize_sites("indeed,monster")
        self.assertIsNone(sites)
        self.assertIn("monster", err)


class TestLinkedInConflict(unittest.TestCase):
    def test_no_conflict_without_linkedin(self):
        self.assertIsNone(cli.linkedin_conflict(["indeed"], 7, True, None, True))

    def test_single_filter_group_is_fine(self):
        self.assertIsNone(cli.linkedin_conflict(["linkedin"], 7, False, None, False))

    def test_two_groups_conflict(self):
        self.assertIsNotNone(cli.linkedin_conflict(["linkedin"], 7, True, None, False))

    def test_easy_apply_plus_jobage_conflicts(self):
        self.assertIsNotNone(cli.linkedin_conflict(["linkedin"], 7, False, None, True))


class TestClean(unittest.TestCase):
    def test_nan_becomes_none(self):
        self.assertIsNone(cli.clean(float("nan")))

    def test_literal_nan_string_becomes_none(self):
        self.assertIsNone(cli.clean("NaN"))

    def test_empty_string_becomes_none(self):
        self.assertIsNone(cli.clean("   "))

    def test_whitespace_is_trimmed(self):
        self.assertEqual(cli.clean("  Help Desk "), "Help Desk")


class TestRowToResult(unittest.TestCase):
    def test_required_contract_keys_always_present(self):
        result = cli.row_to_result({})
        for key in ("id", "title", "company", "location", "date", "url"):
            self.assertIn(key, result, "contract key %s must never be omitted" % key)
            self.assertIsNone(result[key])

    def test_location_column_is_used_directly(self):
        result = cli.row_to_result({"location": "St. Augustine, FL"})
        self.assertEqual(result["location"], "St. Augustine, FL")

    def test_city_and_state_are_joined_when_location_absent(self):
        result = cli.row_to_result({"city": "St. Augustine", "state": "FL"})
        self.assertEqual(result["location"], "St. Augustine, FL")

    def test_id_falls_back_to_digits_in_url(self):
        result = cli.row_to_result({"job_url": "https://www.linkedin.com/jobs/view/4426311357"})
        self.assertEqual(result["id"], "4426311357")

    def test_explicit_id_wins_over_url(self):
        result = cli.row_to_result({"id": "abc123", "job_url": "https://x/jobs/view/999999"})
        self.assertEqual(result["id"], "abc123")


class TestRender(unittest.TestCase):
    ROWS = [{"site": "indeed", "title": "Help Desk", "company": "Acme",
             "location": "Remote", "date": "2026-08-01", "url": "https://x/1"}]

    def test_json_envelope_shape(self):
        payload = json.loads(cli.render(self.ROWS, 2, "json"))
        self.assertEqual(payload["meta"], {"count": 1, "page": 2})
        self.assertEqual(payload["results"][0]["title"], "Help Desk")

    def test_table_has_header_and_row(self):
        out = cli.render(self.ROWS, 1, "table")
        self.assertIn("TITLE", out)
        self.assertIn("Help Desk", out)

    def test_plain_includes_url(self):
        self.assertIn("https://x/1", cli.render(self.ROWS, 1, "plain"))

    def test_missing_cells_render_as_dash(self):
        self.assertIn("-", cli.render([{}], 1, "table"))


class TestMainDispatch(unittest.TestCase):
    def test_unknown_command_reports_bad_cmd(self):
        code, err = capture_stderr_json(cli.main, ["frobnicate"])
        self.assertEqual(code, 1)
        self.assertEqual(err["code"], "BAD_CMD")

    def test_detail_without_id_reports_no_id(self):
        code, err = capture_stderr_json(cli.main, ["detail"])
        self.assertEqual(code, 1)
        self.assertEqual(err["code"], "NO_ID")

    def test_help_exits_zero_on_stdout(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = cli.main([])
        self.assertEqual(code, 0)
        self.assertIn("USAGE", buf.getvalue())

    def test_bad_site_never_writes_to_stdout(self):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = cli.main(["search", "--site", "monster"])
        self.assertEqual(code, 1)
        self.assertEqual(out.getvalue(), "", "errors must never go to stdout")
        self.assertEqual(json.loads(err.getvalue())["code"], "BAD_ARG")

    def test_linkedin_filter_conflict_surfaces_its_code(self):
        code, err = capture_stderr_json(
            cli.main, ["search", "--site", "linkedin", "--jobage", "7", "--easy-apply"]
        )
        self.assertEqual(code, 1)
        self.assertEqual(err["code"], "LINKEDIN_FILTER_CONFLICT")


class TestBuildSearchOpts(unittest.TestCase):
    def test_defaults(self):
        opts, code = cli.build_search_opts(cli.parse_flags(["search"]))
        self.assertEqual(code, 0)
        self.assertEqual(opts["limit"], 20)
        self.assertEqual(opts["page"], 1)
        self.assertEqual(opts["country"], "USA")
        self.assertEqual(opts["format"], "json")

    def test_page_is_clamped_to_at_least_one(self):
        opts, _ = cli.build_search_opts(cli.parse_flags(["search", "--page", "0"]))
        self.assertEqual(opts["page"], 1)

    def test_unknown_format_falls_back_to_json(self):
        opts, _ = cli.build_search_opts(cli.parse_flags(["search", "--format", "yaml"]))
        self.assertEqual(opts["format"], "json")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Multi-board job search CLI built on JobSpy.

Covers LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, Bayt, Naukri and
Bdjobs through a single interface, and emits the same JSON contract as the
Bun/TypeScript portal CLIs in this repo:

    stdout  {"meta": {"count": N, "page": N}, "results": [...]}
    stderr  {"error": "...", "code": "..."}   (exit 1)

PERSONAL USE ONLY. Automated access to LinkedIn and several other boards is
against their Terms of Service. Keep query volume low, do not use this
commercially or for bulk data collection, and run it on your own responsibility.
"""

import json
import os
import re
import sys
import tempfile

SITES = [
    "linkedin",
    "indeed",
    "glassdoor",
    "zip_recruiter",
    "google",
    "bayt",
    "naukri",
    "bdjobs",
]

FORMATS = ("json", "table", "plain")

# `detail` reads back the description captured during the last `search`.
# JobSpy has no fetch-one-job-by-id endpoint, so the cache is what makes a
# contract-compliant `detail` command possible. See README.
CACHE_PATH = os.path.join(tempfile.gettempdir(), "jobspy-search-cache.json")

HELP = """jobspy-search - multi-board job search (LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google)

USAGE
  cli.py search [flags]
  cli.py detail <id|url>

SEARCH FLAGS
  -q, --query <text>      Keyword search (title, skill, role). Recommended.
  -l, --location <text>   "Remote", "St. Augustine, FL", "United States", ...
      --site <list>       Comma-separated boards. Default: indeed,linkedin
                          Valid: %s
      --jobage <days>     Only postings from the last N days.
      --limit <n>         Results wanted per board. Default 20.
      --page <n>          1-indexed page; becomes an offset. Default 1.
      --remote            Remote positions only.
      --easy-apply        Only listings with a hosted quick-apply path.
      --country <name>    Country for Indeed/Glassdoor. Default USA.
      --distance <miles>  Search radius. Default 50.
      --job-type <type>   fulltime | parttime | contract | internship | temporary
      --format <fmt>      json | table | plain. Default json.

DETAIL
  Reads the full record, including description, from the last search's cache.
  Run a search first. Cache: %s

NOTE
  LinkedIn accepts only ONE of: --jobage, (--remote / --job-type), --easy-apply.
  Combining them is rejected with code LINKEDIN_FILTER_CONFLICT.
""" % (", ".join(SITES), CACHE_PATH)


def write_error(message, code):
    """Errors always go to stderr as JSON. Never to stdout."""
    sys.stderr.write(json.dumps({"error": message, "code": code}) + "\n")


def parse_flags(argv):
    """Hand-rolled parser mirroring the repo's TypeScript portal CLIs."""
    aliases = {"q": "query", "l": "location", "n": "limit"}
    flags = {"_": []}
    i = 0
    while i < len(argv):
        token = argv[i]
        if token.startswith("-"):
            key = token.lstrip("-")
            key = aliases.get(key, key).replace("-", "_")
            if i + 1 < len(argv) and not argv[i + 1].startswith("-"):
                flags[key] = argv[i + 1]
                i += 2
            else:
                flags[key] = True
                i += 1
        else:
            flags["_"].append(token)
            i += 1
    return flags


def parse_int_flag(name, raw):
    """Returns None and reports BAD_ARG when the value is not an integer."""
    try:
        return int(str(raw))
    except (TypeError, ValueError):
        write_error('--%s must be a number, got "%s"' % (name, raw), "BAD_ARG")
        return None


def normalize_sites(raw):
    """Split and validate --site. Returns (sites, error_message)."""
    if raw is None or raw is True:
        return ["indeed", "linkedin"], None
    sites = [s.strip().lower() for s in str(raw).split(",") if s.strip()]
    if not sites:
        return None, "--site was empty"
    unknown = [s for s in sites if s not in SITES]
    if unknown:
        return None, "unknown site(s): %s. Valid: %s" % (
            ", ".join(unknown),
            ", ".join(SITES),
        )
    return sites, None


def linkedin_conflict(sites, jobage, remote, job_type, easy_apply):
    """LinkedIn allows only one filter group at a time; detect the clash early."""
    if "linkedin" not in sites:
        return None
    groups = 0
    if jobage is not None:
        groups += 1
    if remote or job_type:
        groups += 1
    if easy_apply:
        groups += 1
    if groups > 1:
        return (
            "LinkedIn accepts only one of: --jobage, (--remote/--job-type), "
            "--easy-apply. Narrow the filters or drop linkedin from --site."
        )
    return None


def clean(value):
    """DataFrame cells to JSON-safe values. Missing becomes None, never omitted."""
    if value is None:
        return None
    try:
        # NaN is the only value that is not equal to itself.
        if value != value:
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(value, "isoformat"):
        return value.isoformat()[:10]
    text = str(value).strip()
    return text if text and text.lower() != "nan" else None


def row_to_result(row):
    """Map a JobSpy DataFrame row onto the repo's portal-result shape."""
    # Current JobSpy emits a single "location" column. Older builds split it
    # into city/state, so fall back to joining those if location is absent.
    location = clean(row.get("location"))
    if not location:
        parts = [clean(row.get("city")), clean(row.get("state"))]
        location = ", ".join([p for p in parts if p]) or None
    url = clean(row.get("job_url"))
    ident = clean(row.get("id"))
    if not ident and url:
        tail = re.findall(r"(\d{6,})", url)
        ident = tail[-1] if tail else url
    return {
        "id": ident,
        "title": clean(row.get("title")),
        "company": clean(row.get("company")),
        "location": location,
        "date": clean(row.get("date_posted")),
        "url": url,
        "site": clean(row.get("site")),
        "jobType": clean(row.get("job_type")),
        "isRemote": bool(row.get("is_remote")) if row.get("is_remote") == row.get("is_remote") else None,
        "salaryMin": clean(row.get("min_amount")),
        "salaryMax": clean(row.get("max_amount")),
        "salaryInterval": clean(row.get("interval")),
        "description": clean(row.get("description")),
    }


def render(results, page, fmt):
    """json envelope, fixed-width table, or a plain block per job."""
    if fmt == "json":
        payload = {"meta": {"count": len(results), "page": page}, "results": results}
        return json.dumps(payload, indent=2)
    if fmt == "table":
        head = ("SITE", "TITLE", "COMPANY", "LOCATION", "DATE")
        widths = [10, 42, 26, 24, 10]
        lines = ["  ".join(h.ljust(w) for h, w in zip(head, widths))]
        for r in results:
            cells = [r.get("site"), r.get("title"), r.get("company"), r.get("location"), r.get("date")]
            lines.append(
                "  ".join((c or "-")[:w].ljust(w) for c, w in zip(cells, widths))
            )
        return "\n".join(lines)
    blocks = []
    for r in results:
        blocks.append(
            "%s\n  %s | %s | %s\n  %s"
            % (
                r.get("title") or "-",
                r.get("company") or "-",
                r.get("location") or "-",
                r.get("date") or "-",
                r.get("url") or "-",
            )
        )
    return "\n\n".join(blocks)


def run_search(opts):
    try:
        from jobspy import scrape_jobs
    except ImportError:
        write_error(
            "python-jobspy is not installed. Run: pip install -U python-jobspy",
            "MISSING_DEPENDENCY",
        )
        return 1

    kwargs = {
        "site_name": opts["sites"],
        "search_term": opts["query"],
        "location": opts["location"],
        "results_wanted": opts["limit"],
        "distance": opts["distance"],
        "country_indeed": opts["country"],
    }
    if opts["jobage"] is not None:
        kwargs["hours_old"] = opts["jobage"] * 24
    if opts["remote"]:
        kwargs["is_remote"] = True
    if opts["easy_apply"]:
        kwargs["easy_apply"] = True
    if opts["job_type"]:
        kwargs["job_type"] = opts["job_type"]
    if opts["page"] > 1:
        kwargs["offset"] = (opts["page"] - 1) * opts["limit"]
    if "linkedin" in opts["sites"]:
        kwargs["linkedin_fetch_description"] = True

    try:
        frame = scrape_jobs(**kwargs)
    except Exception as exc:  # noqa: BLE001 - surface any scrape failure uniformly
        write_error("Search failed: %s" % exc, "SEARCH_FAILED")
        return 1

    results = []
    if frame is not None and len(frame) > 0:
        for _, row in frame.iterrows():
            results.append(row_to_result(row))

    try:
        with open(CACHE_PATH, "w") as handle:
            json.dump({"results": results}, handle)
    except OSError:
        pass  # A read-only tmp is not a reason to fail the search.

    sys.stdout.write(render(results, opts["page"], opts["format"]) + "\n")
    return 0


def run_detail(needle, fmt):
    if not needle:
        write_error("detail requires a job id or url", "NO_ID")
        return 1
    try:
        with open(CACHE_PATH) as handle:
            cached = json.load(handle).get("results", [])
    except (OSError, ValueError):
        write_error(
            "No cached results. Run a search first (cache: %s)" % CACHE_PATH,
            "NO_CACHE",
        )
        return 1

    needle = str(needle)
    for record in cached:
        if record.get("id") == needle or record.get("url") == needle:
            if fmt == "json":
                sys.stdout.write(json.dumps(record, indent=2) + "\n")
            else:
                sys.stdout.write(
                    "%s\n%s | %s | %s\n%s\n\n%s\n"
                    % (
                        record.get("title") or "-",
                        record.get("company") or "-",
                        record.get("location") or "-",
                        record.get("date") or "-",
                        record.get("url") or "-",
                        record.get("description") or "(no description captured)",
                    )
                )
            return 0
    write_error("No cached job matching: %s" % needle, "NOT_FOUND")
    return 1


def build_search_opts(flags):
    """Validate flags into an options dict. Returns (opts, exit_code)."""
    sites, site_error = normalize_sites(flags.get("site"))
    if site_error:
        write_error(site_error, "BAD_ARG")
        return None, 1

    jobage = None
    if "jobage" in flags:
        jobage = parse_int_flag("jobage", flags["jobage"])
        if jobage is None:
            return None, 1

    limit = 20
    if "limit" in flags:
        limit = parse_int_flag("limit", flags["limit"])
        if limit is None:
            return None, 1

    page = 1
    if "page" in flags:
        page = parse_int_flag("page", flags["page"])
        if page is None:
            return None, 1
        page = max(1, page)

    distance = 50
    if "distance" in flags:
        distance = parse_int_flag("distance", flags["distance"])
        if distance is None:
            return None, 1

    remote = bool(flags.get("remote"))
    easy_apply = bool(flags.get("easy_apply"))
    job_type = flags.get("job_type")
    job_type = job_type if isinstance(job_type, str) else None

    conflict = linkedin_conflict(sites, jobage, remote, job_type, easy_apply)
    if conflict:
        write_error(conflict, "LINKEDIN_FILTER_CONFLICT")
        return None, 1

    fmt = flags.get("format")
    fmt = fmt if fmt in FORMATS else "json"

    query = flags.get("query")
    location = flags.get("location")
    country = flags.get("country")

    return {
        "sites": sites,
        "query": query if isinstance(query, str) else None,
        "location": location if isinstance(location, str) else None,
        "country": country if isinstance(country, str) else "USA",
        "jobage": jobage,
        "limit": limit,
        "page": page,
        "distance": distance,
        "remote": remote,
        "easy_apply": easy_apply,
        "job_type": job_type,
        "format": fmt,
    }, 0


def main(argv):
    flags = parse_flags(argv)
    command = flags["_"][0] if flags["_"] else None

    if command is None or "help" in flags or "h" in flags:
        sys.stdout.write(HELP)
        return 0
    if command == "search":
        opts, code = build_search_opts(flags)
        if opts is None:
            return code
        return run_search(opts)
    if command == "detail":
        fmt = flags.get("format")
        fmt = fmt if fmt in FORMATS else "json"
        return run_detail(flags["_"][1] if len(flags["_"]) > 1 else None, fmt)

    write_error('Unknown command: "%s"' % command, "BAD_CMD")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

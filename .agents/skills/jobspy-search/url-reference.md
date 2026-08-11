# Data source reference: JobSpy

This skill does not call board endpoints directly. It delegates to
[JobSpy](https://github.com/speedyapply/JobSpy) (`pip install python-jobspy`),
which owns the per-board scrapers, pagination, and anti-bot handling.

This file records the **library** surface the CLI depends on, which is what a
future maintainer needs when JobSpy changes.

## Entry point

`jobspy.scrape_jobs(...)` returns a pandas DataFrame.

Verified parameter list from the installed package:

```
ca_cert, country_indeed, description_format, distance, easy_apply,
enforce_annual_salary, google_search_term, hours_old, is_remote, job_type,
kwargs, linkedin_company_ids, linkedin_fetch_description, location, offset,
proxies, results_wanted, search_term, site_name, user_agent, verbose
```

## Flag to parameter mapping

| CLI flag | `scrape_jobs` parameter | Notes |
|---|---|---|
| `--site` | `site_name` | List. Validated against the supported-board list |
| `--query` / `-q` | `search_term` | |
| `--location` / `-l` | `location` | |
| `--limit` | `results_wanted` | Per board, not total |
| `--page` | `offset` | `offset = (page - 1) * limit` |
| `--jobage` | `hours_old` | `hours_old = days * 24` |
| `--remote` | `is_remote` | |
| `--easy-apply` | `easy_apply` | Passthrough; board support varies |
| `--job-type` | `job_type` | |
| `--country` | `country_indeed` | Indeed and Glassdoor only |
| `--distance` | `distance` | Miles |
| (automatic) | `linkedin_fetch_description` | Set when `linkedin` is in `--site` |

Unused upstream parameters worth knowing about: `proxies` (round-robins to
dodge rate limits), `google_search_term` (Google needs its own phrasing),
`description_format`, `enforce_annual_salary`, `ca_cert`, `user_agent`.

## Output columns

Verified `desired_order` from `jobspy.util`:

```
id, site, job_url, job_url_direct, title, company, location, date_posted,
job_type, salary_source, interval, min_amount, max_amount, currency, is_remote,
job_level, job_function, listing_type, emails, description, company_industry,
company_url, company_logo, company_url_direct, company_addresses,
company_num_employees, company_revenue, company_description,
skills, experience_range   (the last two are Naukri-specific)
```

**Location is a single `location` column.** Some documentation and older
versions describe separate `city` / `state` columns; `row_to_result` in `cli.py`
prefers `location` and falls back to joining `city` and `state` if it is absent,
so both shapes work.

## Board quirks that shape the CLI

- **LinkedIn filter groups.** LinkedIn accepts only one of: `hours_old`, *or*
  `job_type` / `is_remote`, *or* `easy_apply`. Combining them yields wrong or
  empty results, so `linkedin_conflict()` rejects it before any request with
  `LINKEDIN_FILTER_CONFLICT`.
- **~1000 result ceiling** per search on every board.
- **LinkedIn rate-limits near page 10** from one IP; 429 surfaces as
  `SEARCH_FAILED`.
- **Indeed is the most permissive** board and the best default.
- **No fetch-one-job endpoint exists**, which is why `detail` is backed by the
  search cache at `$TMPDIR/jobspy-search-cache.json` rather than a live request.

## If JobSpy changes

1. Re-run `inspect.signature(jobspy.scrape_jobs)` and reconcile the mapping table.
2. Re-check `desired_order` in `jobspy.util` against `row_to_result`.
3. `python3 cli/tests/test_cli.py` covers the mapping contract, so a renamed
   column shows up as `None` in the required keys rather than a crash. The tests
   pass either way, so verify the column list by hand after a JobSpy upgrade.

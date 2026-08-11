---
name: jobspy-search
version: 1.0.0
description: >
  Search job listings across LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google,
  Bayt, Naukri and Bdjobs from one command, in any country or remotely. Use when
  the user wants to find job openings, vacancies, or hiring across several
  boards at once, filter by recency or remote status, or find quick-apply
  listings. Trigger phrases: find jobs, job search, search multiple job boards,
  remote jobs, entry level jobs, one click apply, easy apply, quick apply,
  scrape LinkedIn jobs, scrape Indeed, job openings, vacancies, who is hiring.
context: fork
allowed-tools: Bash(python3 .agents/skills/jobspy-search/cli/cli.py *)
---

# JobSpy Multi-Board Search

Searches eight job boards through one interface, built on
[JobSpy](https://github.com/speedyapply/JobSpy). Complements the per-portal CLIs
in this repo: use `linkedin-search` when you want LinkedIn alone with zero
dependencies, and this skill when you want breadth in a single call.

## ⚠️ Personal use only

Automated access to LinkedIn, Indeed, Glassdoor and ZipRecruiter is against
their Terms of Service. **Keep query volume low, do not use this commercially or
for bulk data collection, and run it on your own responsibility.** Repeated
high-volume querying will get your IP rate-limited or blocked, and can put a
LinkedIn account at risk. CI in this repo deliberately makes no live requests.

## Requirements

Unlike the Bun portal CLIs, this skill has one runtime dependency:

```bash
pip install -U python-jobspy      # requires Python 3.10+
```

If it is missing, the CLI exits 1 with `{"code": "MISSING_DEPENDENCY"}` rather
than a traceback.

## Commands

### Search

```bash
python3 .agents/skills/jobspy-search/cli/cli.py search [flags]
```

| Flag | Meaning |
|---|---|
| `-q`, `--query <text>` | Keyword search. Recommended. |
| `-l`, `--location <text>` | `"Remote"`, `"St. Augustine, FL"`, `"United States"` |
| `--site <list>` | Comma-separated. Default `indeed,linkedin`. Valid: `linkedin, indeed, glassdoor, zip_recruiter, google, bayt, naukri, bdjobs` |
| `--jobage <days>` | Only postings from the last N days |
| `--limit <n>` | Results wanted per board. Default 20 |
| `--page <n>` | 1-indexed, becomes an offset. Default 1 |
| `--remote` | Remote positions only |
| `--easy-apply` | Only listings with a hosted quick-apply path |
| `--country <name>` | Country for Indeed/Glassdoor. Default `USA` |
| `--distance <miles>` | Search radius. Default 50 |
| `--job-type <type>` | `fulltime`, `parttime`, `contract`, `internship`, `temporary` |
| `--format <fmt>` | `json`, `table`, `plain`. Default `json` |

### Detail

```bash
python3 .agents/skills/jobspy-search/cli/cli.py detail <id|url>
```

JobSpy has no fetch-one-job endpoint, so `detail` reads the full record,
including the description, from the previous search's cache
(`$TMPDIR/jobspy-search-cache.json`). **Run a search first**, otherwise you get
`{"code": "NO_CACHE"}`.

## Examples

```bash
# Entry-level remote IT support across Indeed and LinkedIn, last 7 days
python3 .agents/skills/jobspy-search/cli/cli.py search \
  -q "Help Desk" -l "Remote" --jobage 7 --limit 15 --format table

# Quick-apply listings only, Indeed and ZipRecruiter
python3 .agents/skills/jobspy-search/cli/cli.py search \
  -q "IT Support Specialist" -l "United States" \
  --site indeed,zip_recruiter --easy-apply --format table

# Remote SOC analyst roles across four boards
python3 .agents/skills/jobspy-search/cli/cli.py search \
  -q "SOC Analyst" --site indeed,linkedin,glassdoor,google --remote --limit 10

# Northeast Florida, on-site or hybrid, within 40 miles
python3 .agents/skills/jobspy-search/cli/cli.py search \
  -q "IT Technician" -l "Jacksonville, FL" --distance 40 --format table

# Full description for one result from the last search
python3 .agents/skills/jobspy-search/cli/cli.py detail 4426311357 --format plain
```

## Output

`search --format json` emits the repo's standard portal envelope:

```json
{
  "meta": { "count": 2, "page": 1 },
  "results": [
    {
      "id": "in-8f2c1b",
      "title": "Technical Support Representative",
      "company": "Acme",
      "location": "Remote",
      "date": "2026-08-01",
      "url": "https://www.indeed.com/viewjob?jk=8f2c1b",
      "site": "indeed",
      "jobType": "fulltime",
      "isRemote": true,
      "salaryMin": "20.0",
      "salaryMax": "24.0",
      "salaryInterval": "hourly",
      "description": "..."
    }
  ]
}
```

`id`, `title`, `company`, `location`, `date` and `url` are always present;
missing values are `null`, never omitted.

| Format | Best for |
|---|---|
| `json` | Default. Programmatic use, passing ids to `detail` |
| `table` | Quick human scanning |
| `plain` | Reading one job's full detail |

## Error codes

Errors go to **stderr** as `{"error": "...", "code": "..."}` with exit 1.

| Code | Meaning |
|---|---|
| `BAD_ARG` | Non-numeric numeric flag, or an unknown `--site` |
| `BAD_CMD` | Unknown command |
| `NO_ID` | `detail` called without an id or url |
| `NO_CACHE` | `detail` before any `search` |
| `NOT_FOUND` | No cached job matches that id or url |
| `MISSING_DEPENDENCY` | `python-jobspy` is not installed |
| `SEARCH_FAILED` | Network, rate-limit, or upstream scrape failure |
| `LINKEDIN_FILTER_CONFLICT` | See below |

## Notes and gotchas

- **LinkedIn accepts only one filter group per query**: `--jobage`, *or*
  (`--remote` / `--job-type`), *or* `--easy-apply`. The CLI rejects the
  combination up front instead of silently returning wrong results.
- **All boards cap out around 1000 results** for a given search.
- **LinkedIn rate-limits around the 10th page** from a single IP. Keep `--limit`
  modest and pause between runs.
- **Indeed is the most reliable board** and the least rate-limited; start there.
- **`--easy-apply` is a JobSpy passthrough** and is not supported identically on
  every board. Treat it as a hint, then confirm the apply path on the posting.
- Descriptions are fetched for LinkedIn automatically (`linkedin_fetch_description`),
  which makes those searches noticeably slower.

## Testing

```bash
python3 .agents/skills/jobspy-search/cli/tests/test_cli.py
```

35 network-free unit tests covering flag parsing, validation, row mapping and
rendering. They do not require `python-jobspy` to be installed.

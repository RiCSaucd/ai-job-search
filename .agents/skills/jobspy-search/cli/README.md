# jobspy-search CLI

Multi-board job search over [JobSpy](https://github.com/speedyapply/JobSpy),
emitting the same JSON contract as this repo's Bun/TypeScript portal CLIs.

See `../SKILL.md` for the full flag reference and examples.

## Why this one is Python

Every other portal skill in `.agents/skills/` is zero-dependency Bun +
TypeScript. This one deviates deliberately:

- JobSpy is a maintained Python library that already covers eight boards,
  including LinkedIn and Indeed, with their pagination and anti-bot handling
  solved. Reimplementing that in TypeScript would be a large amount of fragile
  parser code duplicating an existing, tested project.
- The deviation is confined to the **implementation**. The **wire contract** is
  unchanged: `search` / `detail` commands, the same flags, the same
  `{"meta": {...}, "results": [...]}` stdout envelope, the same
  `{"error", "code"}` stderr shape with exit 1. Anything consuming portal CLIs
  (for example `/scrape`) can treat this identically to `linkedin-search`.

Consequences to be aware of:

- **One runtime dependency**: `pip install -U python-jobspy` (Python 3.10+).
  This skill is therefore **not** in the `cli-typecheck` matrix in
  `.github/workflows/ci.yml`, which runs `bun run typecheck` against the
  TypeScript CLIs only.
- `tools/security_guards.py` forbids lifecycle scripts in
  `.agents/**/package.json`. This skill ships no `package.json`, so that guard
  is satisfied by construction.

## Install

```bash
pip install -U python-jobspy
```

## Run

```bash
python3 cli.py search -q "Help Desk" -l "Remote" --jobage 7 --format table
python3 cli.py detail <id|url> --format plain
```

## Test

```bash
python3 tests/test_cli.py
```

35 tests, no network, no `python-jobspy` required. They cover flag parsing,
numeric validation, `--site` validation, the LinkedIn filter-conflict rule, the
DataFrame row mapping (including the "contract keys are never omitted" rule),
all three renderers, and the guarantee that **errors never reach stdout**.

## Verification status

The unit suite passes and the flag surface has been validated against the real
`scrape_jobs` signature and the real output-column list from the installed
`python-jobspy` package.

**Live board queries have not been verified from the development sandbox**,
because its network policy blocks `indeed.com` and `linkedin.com` outright
(`CONNECT tunnel failed, response 403`). The CLI handles that cleanly, returning
`SEARCH_FAILED` with the underlying proxy error and exit 1 rather than crashing.

To smoke-test it for real, run this from a normal network:

```bash
python3 cli.py search -q "Help Desk" -l "Remote" --site indeed --limit 5 --format table
```

Expect five rows with non-empty titles, companies and URLs. If you get
`SEARCH_FAILED` with a 403 or proxy error, you are still behind a blocking
network. If you get it with a 429, you are being rate-limited: wait, lower
`--limit`, and consider the `proxies` support in JobSpy upstream.

## Detail cache

JobSpy has no fetch-one-job-by-id endpoint. `search` therefore writes its
results, descriptions included, to `$TMPDIR/jobspy-search-cache.json`, and
`detail <id|url>` reads back from that file. Run a search first. The cache lives
in the system temp directory, not the repo, so nothing personal is written into
version control.

---
name: remote-it-blitz
description: >
  Sprint search for entry-level remote IT roles (help desk, service desk, technical
  support, IT support, NOC, junior SOC) across every reachable platform, ranked by how
  fast an application can actually be submitted — one-click / Easy Apply / Quick Apply
  first. Built for short deadlines: produces a ready-to-execute apply queue, not just a
  list. Triggers on: remote IT jobs, entry level IT, help desk jobs, one click apply,
  easy apply, quick apply, apply fast, job blitz, I need a job this week,
  /remote-it-blitz
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(bun --version), Bash(bun run .agents/skills/*/cli/src/cli.ts *), Bash(curl *), WebFetch, WebSearch, AskUserQuestion, mcp__Indeed__search_jobs, mcp__Indeed__get_job_details
---

# Remote IT Blitz

A volume-and-speed job search for **entry-level remote IT** roles, optimized for a short
deadline. The organizing principle is different from `/scrape`:

| | `/scrape` | `/remote-it-blitz` |
|---|---|---|
| Optimizes for | Best-fit matches | Applications submitted per hour |
| Ranks by | Fit score | **Time-to-apply**, then fit |
| Output | A table to review | An **apply queue** to execute top-down |
| Apply path | Ignored | **Primary ranking signal** |

Use `/scrape` when there's time to be selective. Use this when the deadline is days away
and the goal is to get a high volume of *credible* applications in fast.

## Invocation

- "Find me remote IT jobs"
- "Entry level help desk, one click apply"
- "/remote-it-blitz"

Optional arguments:
- `--deadline <n>` — days available (default 2). Drives how aggressively Tier C is skipped.
- `--tier1-only` — only roles with a genuine one-click/quick-apply path.
- `--include-onsite` — also include Northeast Florida on-site/hybrid (St. Augustine / Jacksonville).
- `--target <n>` — how many applications to queue (default 15).

---

## Step 0: Load State

1. Read `job_scraper/seen_jobs.json` (create as `{"seen": {}}` if missing).
2. Read `job_search_tracker.csv` (may not exist yet) — build the exclusion set of
   company+role already applied to.
3. Read `platforms.md`, `queries.md`, and `apply-answers.md` from this directory.

---

## Step 1: Probe Tool Reachability (do this FIRST — do not skip)

**Availability differs enormously between environments, and silently.** A search that
returns nothing because a host is blocked looks identical to a search that returns
nothing because there are no jobs. Probe before searching, and report what was actually
reachable in the final output.

Run these three checks:

```bash
# A. Is bun present (needed for the .agents/skills/* portal CLIs)?
bun --version

# B. Can the sandbox reach a job board host directly?
curl -sS -o /dev/null -w "%{http_code}" --max-time 20 https://remoteok.com/api
```

C. Confirm whether the Indeed MCP tools (`mcp__Indeed__search_jobs`) are present in the
current tool list.

Classify the environment:

- **Local / unrestricted** — bun works, curl returns 200. Full platform set available;
  use the portal CLIs in `.agents/skills/` as the primary engine.
- **Restricted sandbox** — curl/WebFetch return `403`, `000`, or `CONNECT tunnel failed`.
  This is the normal case for Claude Code on the web: the network policy allows the MCP
  servers and WebSearch, but blocks direct scraping of job boards, **including LinkedIn's
  `jobs-guest` endpoints** (so `linkedin-search` will fail with `403 Forbidden`).
  Fall back to **Indeed MCP + WebSearch** and say so in the output.

> Do not spend retries fighting a policy denial. A `CONNECT tunnel failed, response 403`
> from the agent proxy is a network policy block, not rate limiting — it will not
> succeed on retry, and it is not fixed by changing user agents. Note it and move on.

---

## Step 2: Search by Apply-Speed Tier

Read `platforms.md` for the full platform matrix. Work the tiers in order and stop early
once `--target` credible roles are queued.

### Tier A — one-click / quick apply (search first, always)
Roles where the application is a profile-backed submit: Indeed *Easily Apply*, LinkedIn
*Easy Apply*, ZipRecruiter *1-Tap*, Dice *Easy Apply*, Wellfound, SimplyHired.

### Tier B — fast pipelines (recruiter- or volume-driven)
Staffing firms and high-volume BPO employers that move in days, not weeks: TEKsystems,
Insight Global, Robert Half, Motion Recruitment; Concentrix, TTEC, Foundever, Sutherland,
Alorica, Kelly. Application is a short form, and screening calls often come within 48h.

### Tier C — standard ATS (only if the deadline allows)
Workday / Greenhouse / Lever / iCIMS company career pages. Highest quality, slowest to
complete. With `--deadline 2`, cap Tier C at the 2–3 strongest fits.

For each tier, translate the query bank in `queries.md` into each platform's own
interface. **Use each portal CLI's documented flags — read its `SKILL.md`, do not guess.**

---

## Step 3: Filter — Correct for Known Search-Tool Defects

Search results in this domain are unusually dirty. Apply all four filters before scoring;
each one exists because of a specific, observed failure mode.

### 3a. The remote filter leaks — verify remote per posting
`location: "remote"` on Indeed's MCP returns on-site roles (a job in `Nashville, TN` may
be genuinely remote, and a job tagged `Remote` may be hybrid). The location field is
**not** trustworthy in either direction.

Confirm remote status from the **description text** via `get_job_details` before queueing.
Look for "fully remote", "remote U.S.", "work from home". Watch for the trap of
"Remote (must reside in <state>)" — check it against the candidate's state (FL).

### 3b. Keyword drift — discard semantic garbage
Long natural-language queries degrade badly. Searching
`"Technical Support Representative remote work from home"` returned **ten sales roles**
(Account Executive, Field Sales Rep, Sales Director) and zero support roles. Prefer short,
literal titles: `Help Desk`, `Service Desk Analyst`, `IT Support Specialist`,
`Tier 1 Technical Support`. Drop any result whose title has no support/IT token.

### 3c. Seniority ceiling — entry-level means entry-level
Cut anything requiring 3+ years, a clearance, or a senior/lead/architect title. Keep
Tier II roles only if the description accepts equivalent certifications. `A+`, `Network+`,
`Google IT Support`, "or equivalent experience", and "HS diploma required" are all
positive entry-level signals.

### 3d. Scam and ghost-job screen — MANDATORY
Remote entry-level IT is the single most scam-saturated corner of the job market. **Never
queue a role showing any of these:**

- Asks for SSN, bank details, or a driver's license photo *before* an interview
- Interview conducted entirely over Telegram / Signal / Google Chat, or an instant offer
- Any request to buy equipment, pay for training, or deposit and forward a check
- Company has no independent web presence, or the domain was registered weeks ago
- Compensation far above market for entry level (e.g. "$45/hr, no experience needed")
- A reposted listing older than ~60 days with a rolling date — likely a ghost/pipeline ad

Flag anything borderline as `⚠️ verify` in the output rather than silently dropping it,
and say what triggered the flag.

---

## Step 4: Score for the Sprint

Score each surviving role 0–100. Note this is deliberately **not** the standard fit
framework — under a deadline, a 70% fit submitted today beats a 95% fit submitted next week.

| Weight | Factor | Scoring |
|--------|--------|---------|
| **40** | Time-to-apply | One-click/Easy Apply = 40 · short form = 28 · full ATS = 12 · custom cover letter required = 6 |
| **30** | Fit vs. profile | A+ / Google Cybersecurity certs, Windows/macOS/Linux, CRM, customer-facing comms |
| **15** | Freshness | ≤7 days = 15 · ≤14 = 10 · ≤30 = 5 · older = 0 |
| **15** | Response likelihood | Volume employer / staffing firm = 15 · SMB = 8 · FAANG-tier = 2 |

Sort descending. That order **is** the apply queue.

---

## Step 5: Present the Apply Queue

```
## Remote IT Blitz — YYYY-MM-DD

Reachable this run: <tools that worked>   |   Blocked: <tools that failed, and why>
Screened N postings → M queued (X one-click, Y short form, Z full ATS).

### Apply queue (work top-down)

| # | Score | Apply | Title | Company | Pay | Posted | Fit notes | Link |
|---|-------|-------|-------|---------|-----|--------|-----------|------|
| 1 | 87 | 🟢 1-click | ... | ... | ... | ... | ... | [Apply](...) |

Legend: 🟢 one-click · 🟡 short form (~5 min) · 🔴 full ATS (~20 min) · ⚠️ verify first
```

Then give, for the top 5 only, two lines each: **why it fits** and **the one thing to
tailor** (the single keyword or claim to surface in the application).

Close with the time estimate — e.g. "Queue 1–8 is roughly 45 minutes of clicking" — and:

> "Want me to prep the CV + cover letter for any of these? Give me the numbers.
> For the 🟢 one-click ones, `apply-answers.md` has your prefill answers ready."

---

## Step 6: Persist

1. Write every screened posting to `job_scraper/seen_jobs.json` (new and rejected alike),
   preserving the existing schema and any `rank_score` / `rank_verdict` / `rank_date`
   fields written by `/rank`. Use `status: "queued"` for queued roles.
2. When the user actually applies, append to `job_search_tracker.csv` with the header:
   `date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source`
   Set `channel` to the apply path (`indeed-easyapply`, `linkedin-easyapply`, `ats`, …) so
   `/upskill` and `/outcome` can later analyse which channel actually converts.

---

## Rules

1. **Never fabricate a posting.** Every row must trace to real search/detail output. If a
   platform was unreachable, report it as unreachable — do not fill the gap from memory.
2. **Verify remote from the description**, never from the location field alone (Step 3a).
3. **Run the scam screen on every role** before queueing (Step 3d). This is not optional.
4. **Report blocked platforms explicitly.** A short queue with an honest coverage note is
   worth far more than a padded one.
5. **Respect dedup** against `seen_jobs.json` and `job_search_tracker.csv`.
6. **Don't over-fetch.** Pre-filter on title, then `get_job_details` only on candidates
   that will actually be queued.
7. **One-click ≠ apply without reading.** Always confirm remote-eligibility, pay, and
   state restrictions before submitting, even on a 🟢 role.

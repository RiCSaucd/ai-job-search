# Platform Matrix — Entry-Level Remote IT

Apply-speed tiers, and how each platform is actually reached from this repo.

Reachability legend:
- **MCP** — reachable via an MCP server tool (works in the restricted web sandbox)
- **CLI** — reachable via a portal CLI in `.agents/skills/` (needs `bun` + open network)
- **WS** — reachable indirectly via `WebSearch`
- **Blocked (sandbox)** — direct fetch returns 403 under the web sandbox's network policy;
  works from a local machine

---

## Tier A — one-click / quick apply

Application is a profile-backed submit. These carry the 40-point time-to-apply weight.

| Platform | Apply mechanism | Reachability | Notes |
|---|---|---|---|
| **Indeed** | *Easily Apply* / Indeed Apply | **MCP** (`mcp__Indeed__search_jobs`) | Highest volume for entry-level IT. Only listings badged *Easily Apply* are one-click; the rest bounce to an ATS. Resume must be uploaded to the Indeed profile first. |
| **LinkedIn** | *Easy Apply* | CLI (`linkedin-search`) · **Blocked (sandbox)** | `jobs-guest` endpoints are 403'd by the sandbox network policy. Works locally. Easy Apply pulls straight from the profile — keep it current. |
| **ZipRecruiter** | *1-Tap Apply* | WS | Strong for volume/BPO support roles. Aggressive follow-up email, but genuinely fast. |
| **Dice** | *Easy Apply* | WS | Tech-specific; thinner at true entry level, good for Tier II help desk and NOC. |
| **Glassdoor** | Indeed Apply (shared backend) | WS | Largely mirrors Indeed inventory — dedupe against Indeed results or the queue double-counts. |
| **SimplyHired** | Quick apply | WS | Same corporate family as Indeed; overlapping inventory. Dedupe. |
| **Wellfound** | One-click to startups | WS | Startup IT/support ops. Low volume at entry level, but very fast and low-competition. |
| **Monster / Talent.com** | Quick apply | WS | Heavy aggregator duplication; verify the posting is live before queueing. |

## Tier B — fast pipelines (short form, days not weeks)

Not one-click, but the *decision* is fast — often a screening call within 48 hours. For a
2-day deadline these frequently beat Tier A on actual time-to-offer.

| Employer type | Examples | Why fast |
|---|---|---|
| IT staffing firms | TEKsystems, Insight Global, Robert Half Technology, Motion Recruitment, Apex Systems | Recruiters carry open contract-to-hire help desk reqs and call quickly. One conversation can surface many roles. |
| High-volume BPO / support | Concentrix, TTEC, Foundever, Sutherland, Alorica, Kelly, Working Solutions | Continuous hiring for remote tech support; short applications, automated assessments, fast starts. |
| MSPs | Local + national managed service providers | Constant Tier 1 turnover; A+ carries real weight. Often the best entry-level IT on-ramp. |

Contract-to-hire is worth taking seriously here: it converts a certification-and-labs
profile into billable helpdesk tenure, which is the specific gap the profile names.

## Tier C — standard ATS (slow, highest quality)

Workday · Greenhouse · Lever · iCIMS · SmartRecruiters · Taleo, on company career pages.
15–30 minutes each, frequently re-typing the whole CV. Under a 2-day deadline, cap at the
2–3 strongest fits. Greenhouse and Lever are the fastest of these; Workday and Taleo are
the slowest (account creation per employer).

## Remote-specific boards

| Board | Apply path | Reachability | Notes |
|---|---|---|---|
| We Work Remotely | Redirects to company ATS | **Blocked (sandbox)** · WS | No one-click. Curated, low volume, light IT support. |
| RemoteOK | Redirects to ATS | **Blocked (sandbox)** (`/api` 403s) · WS | Dev-heavy; thin on help desk. |
| Remotive · Working Nomads · DailyRemote | Redirect to ATS | WS | Aggregators — dedupe against Indeed. |
| FlexJobs · Virtual Vocations | Standard forms | WS | **Paid subscriptions.** Scam-screened inventory, which has real value in this category, but don't queue a paid board under a 2-day deadline unless already subscribed. |
| USAJOBS | Federal ATS | WS | Never fast — multi-week to multi-month. Excluded from sprint mode by design. |

## Third-party auto-apply tools

Jobright, Simplify, Teal, LazyApply, Sorce and similar offer bulk/agentic apply.

Present these as an option the user may choose, with the tradeoffs stated plainly — do
not enable or operate one on the user's behalf:

- **Autofill assistants** (Simplify, Teal) fill ATS forms from a stored profile. Low risk,
  genuine time savings, human stays in the loop.
- **Bulk auto-appliers** (LazyApply-style) submit at volume without review. They generally
  breach job-board terms of service, can get a LinkedIn/Indeed account restricted, and
  spray untailored applications that convert poorly. For **20 or so** target applications,
  the honest answer is that manual one-click on Tier A is faster than configuring a bot.

Recommendation: an autofill assistant plus this skill's ranked queue, not a bulk bot.

## Coverage note for the restricted sandbox

Running from Claude Code on the web, expect **Indeed MCP + WebSearch only**. LinkedIn,
RemoteOK, and direct board fetches are blocked by network policy (`CONNECT tunnel failed,
response 403`). Real coverage is therefore materially narrower than a local run — say so
in the output rather than implying the whole market was swept. For full Tier A coverage,
the same skill should be re-run locally where the portal CLIs work.

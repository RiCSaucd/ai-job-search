# Changelog

Notable changes to this Eric Hatch fork of ai-job-search are recorded here
using [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories.
This fork is not independently versioned; Git history retains the detailed
implementation record. Upstream template history lives in
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search).

## [Unreleased]

### Added

- `web-job-brief`, `freelance-outreach`, and `productized-offer` companion
  skills: structured posting briefs for `/apply`, 5-line freelance pitches
  with a profile-grounded rate, and a 1-week automation package when the same
  pain repeats across gigs.
- Cursor subagent `.cursor/agents/ai-automation-hunter.md` to find AI
  automation jobs and gigs and route each lead to those skills or `/apply`.
- Cursor subagent `.cursor/agents/grokbot.md` as the Grok-backed invoke
  target for the same hunt/apply routing (`Use the grokbot subagent to …`).
  It does not rewrite the hunter and does not set a `model:` slug (Cursor
  subagents inherit the parent session).
- `AGENTS.md` Cursor Cloud setup notes (Bun path, TeX Live `moderncv` /
  `fontawesome6` in `TEXMFHOME`, compile engines, portal CLI caveats).
- `tests/test_companion_skills.py` contract coverage for companion skill
  frontmatter, the hunter and grokbot agents, `job_briefs/*.md` gitignore,
  and `tools/lint_skills.py`.
- Gitignore for personal `job_briefs/*.md` output.

### Changed

- Candidate profile and US search targeting for Eric Hatch (St. Augustine,
  FL): IT support, AI automation, cybersecurity foundations, and technical
  customer success, with LinkedIn as the primary portal.
- Insurance-sales résumé facts merged where they match the master résumé:
  Life & Health and P&C licenses recorded as stated on that file. Education
  stays coursework-only (Nichols bachelor's vs SNHU BS conflict). Shultz and
  Lyman is not reframed as an insurance agency.
- README and `CLAUDE.md` wired to the companion skills, hunter, and grokbot.

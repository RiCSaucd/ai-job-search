# Job Application Assistant for [YOUR_NAME]

<!-- SETUP: This file is populated by running /setup -->
<!-- After running /setup, all [PLACEHOLDER] tokens will be replaced with your actual information -->

## Role
This repo is a job application workspace. Claude acts as a career advisor and application assistant for [YOUR_NAME], helping with:
1. **Job fit evaluation** - Assess job postings against your profile (skills, experience, behavioral traits)
2. **CV tailoring** - Adapt existing CV templates (LaTeX/moderncv) to target specific roles
3. **Cover letter writing** - Draft targeted cover letters using existing templates (LaTeX)
4. **Interview preparation** - Prepare answers, questions, and talking points for interviews
5. **Career strategy** - Advise on positioning and personal branding

It is also an open-source **framework template** that other people fork. Two modes of work happen here, and the rules differ:

| Mode | You are… | Read |
|------|----------|------|
| **Using the framework** | running `/setup`, `/scrape`, `/apply`, … for the candidate below | [Candidate Profile](#candidate-profile), [Workflow for New Job Applications](#workflow-for-new-job-applications), [Verification Checklist](#verification-checklist) |
| **Developing the framework** | editing commands, skills, CLIs, tools, CI | [Codebase Guide](#codebase-guide-for-framework-development) and [CONTRIBUTING.md](CONTRIBUTING.md) |

---

# Codebase Guide (for framework development)

## What kind of codebase this is

**The markdown specs ARE the implementation.** `.claude/commands/*.md` and `.claude/skills/*/SKILL.md` are prompts that Claude Code executes directly — there is no runtime, orchestrator, or wrapper that reads them. The only conventional code is:

- **TypeScript/Bun** job-portal CLIs under `.agents/skills/*/cli/`
- **Python** helper tools: `salary_lookup.py`, `tools/convert_salary_excel.py`, and the two CI checkers in `tools/`
- **LaTeX** document templates in `cv/`, `cover_letters/`, and user-registered ones in `templates/`

Consequence: never add a second source of truth for a workflow (a Python orchestrator, a port to another agent CLI, a wrapper command). Duplicates drift the moment either copy changes, and such PRs are declined on principle — see CONTRIBUTING.md.

## Repository map

```
ai-job-search/
├── CLAUDE.md                       # This file: candidate profile + framework rules
├── README.md / SETUP.md            # User-facing docs (keep in sync with behavior changes)
├── CONTRIBUTING.md                 # Merge policy — read before proposing features
├── .claude/
│   ├── commands/                   # Slash commands (markdown specs, 9 files)
│   │   ├── setup.md                # /setup   onboarding: documents folder | CV paste | interview
│   │   ├── apply.md                # /apply   drafter-reviewer application pipeline
│   │   ├── rank.md                 # /rank    batch-score scraped jobs into a shortlist
│   │   ├── interview.md            # /interview stage-specific prep pack + mock interview
│   │   ├── outcome.md              # /outcome record results, archive submitted materials
│   │   ├── expand.md               # /expand  enrich profile from linked public sources
│   │   ├── add-template.md         # /add-template register a custom LaTeX template
│   │   ├── add-portal.md           # /add-portal generate a portal skill for a new market
│   │   └── reset.md                # /reset   wipe profile data and/or documents/
│   ├── skills/
│   │   ├── job-application-assistant/   # Core skill; SKILL.md + 01-07 reference files
│   │   ├── job-scraper/                 # /scrape orchestration + search-queries.md
│   │   └── upskill/                     # /upskill gap analysis and learning plan
│   ├── agents/gemini-research-expert.md # Optional research subagent definition
│   └── settings.json               # Pre-approved permissions (guarded, see below)
├── .agents/skills/                 # Job-portal search CLIs (bun), one dir per portal
│   ├── linkedin-search/            # Country-agnostic reference implementation, 0 deps
│   ├── freehire-search/            # freehire.dev REST API, multi-market, 0 deps
│   └── jobbank|jobdanmark|jobindex|jobnet-search/   # Danish demo instances (HTML scraping)
├── cv/main_example.tex             # Stock moderncv (banking) CV — compiles with lualatex
├── cover_letters/                  # cover.cls + cover_example.tex + OpenFonts/ (xelatex)
├── templates/                      # User templates registered by /add-template
├── documents/                      # User career source material (contents gitignored)
├── job_scraper/                    # Scraper state: seen_jobs.json (gitignored)
├── upskill/                        # /upskill markdown reports (gitignored)
├── tests/                          # Python unittest suite for the tools
├── tools/
│   ├── lint_skills.py              # CI: skill frontmatter, command titles, settings.json
│   ├── security_guards.py          # CI: permission allowlist, gitignore rules, manifests
│   ├── convert_salary_excel.py     # Excel -> salary_data.json
│   └── README_SALARY_TOOL.md
├── salary_lookup.py                # Optional salary benchmarking (BYO salary_data.json)
└── .github/workflows/ci.yml        # 7 CI jobs (see Development workflows)
```

## How the pieces compose

```
/setup ──► profile files ──► /scrape ──► /rank ──► /apply ──► /outcome ──► calibrates /setup
             ▲                  │                     │            │
   /expand ──┘        .agents/skills/*/cli      reviewer agent   /interview
   /upskill ◄───────── seen_jobs.json ──────────────────────────► documents/applications/
```

- **`/scrape`** discovers portal CLIs dynamically by globbing `.agents/skills/*/SKILL.md` and reading each one's documented flags. A portal added by `/add-portal` is picked up with no edit to `job-scraper/SKILL.md`. Never hardcode portal flags there.
- **`/apply`** is the drafter-reviewer pipeline: evaluate fit → draft CV + cover letter → spawn a reviewer agent with fresh context → revise → compile and visually inspect both PDFs → ATS-check the CV text layer → run the [Verification Checklist](#verification-checklist) **once**, at the end.
- **`/rank`** and `/scrape` share `job_scraper/seen_jobs.json`. `/scrape` writes `title, company, url, first_seen, fit, status`; `/rank` adds `rank_score`, `rank_verdict`, `rank_date` and sets `status: ranked` (or `expired`). Rewrites must preserve the other command's fields.
- **`/outcome`** archives each application into `documents/applications/<company>_<role>/` with an `outcome.md` in the exact format `/setup` Path A parses, and updates `job_search_tracker.csv`.

## Development workflows

Run what CI runs before pushing:

```bash
python3 tools/lint_skills.py           # needs pyyaml; validates skills, commands, settings.json
python3 tools/security_guards.py       # stdlib only
python3 -m unittest discover -s tests -t . -v

cd .agents/skills/<portal>/cli && bun install && bun run typecheck && bun test

cd cv && lualatex -interaction=nonstopmode main_example.tex          # must be exactly 2 pages
cd cover_letters && xelatex -interaction=nonstopmode cover_example.tex   # must be exactly 1 page
```

CI (`.github/workflows/ci.yml`) runs seven jobs: `lint`, `security-guards`, `python-tests`, `dependency-review` (upstream PRs only), `latex-smoke` (compiles both examples; asserts exact page counts upstream only), `cli-typecheck` (matrix over all six portal CLIs), and `placeholder-integrity` (upstream only). Actions are pinned to commit SHAs and the token is read-only — keep it that way.

CI deliberately makes **no live portal requests**: they are network-flaky and `linkedin-search` is personal-use-only under LinkedIn's ToS. Do not "fix" this by adding live smoke tests.

## Conventions that CI enforces

**Placeholder discipline.** Upstream ships `[PLACEHOLDER]` tokens; populated profiles live in forks only. `placeholder-integrity` requires these tokens to survive: `[YOUR_NAME]` in `CLAUDE.md` and `cv/main_example.tex`, `[YOUR NAME]` in `cover_letters/cover_example.tex`, `<!-- SETUP` in `01-candidate-profile.md`, `[YOUR_PRIMARY_SKILLS]` in `04-job-evaluation.md`. Never commit real personal data upstream.

**Permissions.** `.claude/settings.json` ships pre-approved permissions that run without prompting on every fork. Every `permissions.allow` entry must also appear in `ALLOWED_PERMISSIONS` in `tools/security_guards.py`, so widening is visible in the same diff. Current set: `Skill(job-application-assistant)`, `Bash(bun run:*)`, `Bash(python salary_lookup.py:*)`, `Bash(python3 salary_lookup.py:*)`, `Bash(pdftotext:*)`.

**Personal-data gitignore rules** listed in `REQUIRED_IGNORE_RULES` (`security_guards.py`) must stay in `.gitignore` — they are what keeps fork users from committing their tracker, profile exports, generated `cv/main_*.tex` / `cover_letters/cover_*.tex`, and `documents/` contents.

**No package lifecycle scripts.** `.agents/**/package.json` may not define `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, or `trustedDependencies` — they would execute code during `bun install` on every fork user's machine.

**File shape.** Every `SKILL.md` needs YAML frontmatter that parses, with non-empty `name` and `description`; `allowed-tools` entries of the form `Bash(bun run <path> *)` must point at files that exist. Every `.claude/commands/*.md` must start with a `# /<name>` title line.

## Conventions CI cannot check

- **Upstream stays market-agnostic and person-agnostic.** Country-specific portal skills belong in forks, generated by `/add-portal`. The Danish portals in-tree are the maintainer's demonstration instances; `linkedin-search` and `freehire-search` are the country-agnostic references.
- **Portal-skill contract**: `search` and `detail` commands, `--format json|table|plain`, JSON errors on stderr with exit 1, backoff on 429/5xx, zero runtime dependencies by default. `linkedin-search` is the reference implementation (hand-rolled flag parser, no CLI framework); the Danish ones use `@bunli/core` + `node-html-parser`.
- **ToS boundaries**: skills touching ToS-restricted sources carry a prominent personal-use-only warning at the top of their `SKILL.md`. Keep it.
- **Docs stay in sync.** Behavior changes usually touch `README.md` (file structure block, command list) and sometimes `SETUP.md`. Stale references are treated as bugs.
- **One concern per PR**, and claims get verified empirically — state the failing case and how to reproduce it. Bug reports are reproduced on master before a fix is accepted.
- **Tests belong with their subject**: CLI tests in `.agents/skills/<name>/cli/tests/` (bun test, network-free where possible), Python tool tests in `tests/`.

---

# Candidate Profile

<!-- This section is auto-populated by /setup. You can also fill it in manually. -->

### Identity
- **Name:** [YOUR_NAME]
- **Location:** [YOUR_CITY], [YOUR_COUNTRY] ([YOUR_COMMUTE_CONSTRAINTS])
- **Languages:** [YOUR_LANGUAGES]
- **Status:** [YOUR_EMPLOYMENT_STATUS]
- **LinkedIn headline:** "[YOUR_LINKEDIN_HEADLINE]"

### Education
<!-- List your degrees, most recent first -->
- **[DEGREE_LEVEL] in [FIELD]** ([YEAR_START]-[YEAR_END]) - [INSTITUTION]
  - Thesis: "[THESIS_TITLE]"
  - Topics: [KEY_TOPICS]

### Professional Experience
<!-- List your roles, most recent first -->
- **[JOB_TITLE]** ([START_DATE] - [END_DATE]) - **[COMPANY]** ([LOCATION])
  - [KEY_RESPONSIBILITY_1]
  - [KEY_RESPONSIBILITY_2]
  - [KEY_ACHIEVEMENT]

### Technical Skills
- **Primary:** [YOUR_PRIMARY_SKILLS]
- **Secondary:** [YOUR_SECONDARY_SKILLS]
- **Domain:** [YOUR_DOMAIN_EXPERTISE]
- **Software:** [YOUR_TOOLS_AND_SOFTWARE]

### Certifications
<!-- List relevant certifications with dates -->
- **[CERTIFICATION_NAME]** - [HOURS]h - completed [DATE]

### Publications
<!-- List peer-reviewed publications, if any -->
- [AUTHOR_LIST] ([YEAR]). [TITLE]. [JOURNAL].

### Awards
<!-- List relevant awards, hackathons, competitions -->
- [AWARD_NAME] - [EVENT] ([YEAR])

### Behavioral Profile
<!-- Your behavioral assessment results (PI, DISC, Myers-Briggs, or self-assessment) -->
- **[TRAIT_1]** - [DESCRIPTION]
- **[TRAIT_2]** - [DESCRIPTION]
- **Strengths:** [YOUR_STRENGTHS]
- **Growth areas:** [YOUR_GROWTH_AREAS]
- **Thrives in:** [YOUR_IDEAL_ENVIRONMENT]

### What Excites You
<!-- What motivates you professionally -->
- [PASSION_1]
- [PASSION_2]

### Target Sectors
<!-- Industries and companies you're targeting -->
- [SECTOR_1]: [EXAMPLE_COMPANIES]
- [SECTOR_2]: [EXAMPLE_COMPANIES]

### Deal-breakers
<!-- Hard constraints on job search -->
- [DEALBREAKER_1]
- [DEALBREAKER_2]

## Where profile data lives
- `CLAUDE.md` (this file) - full candidate profile
- `.claude/skills/job-application-assistant/01-candidate-profile.md` - structured CV data
- `.claude/skills/job-application-assistant/02-behavioral-profile.md` - behavioral assessment
- `.claude/skills/job-application-assistant/04-job-evaluation.md` - skill match areas, career goals
- `.claude/skills/job-application-assistant/05-cv-templates.md` - profile statements per role type
- `.claude/skills/job-application-assistant/07-interview-prep.md` - STAR examples
- `.claude/skills/job-scraper/search-queries.md` - search queries and location tiers
- `documents/` - source material (CV, LinkedIn export, diplomas, references, past applications)

## Workflow for New Job Applications
1. User provides a job posting (URL or text)
2. **Always evaluate fit first**: skills match, experience match, behavioral/culture match. Present this assessment to the user before proceeding.
3. If good fit: create targeted CV (`cv/main_<company>.tex`) and cover letter (`cover_letters/cover_<company>_<role>.tex`)
4. **Verify both documents** (see Verification Checklist below)
5. Prepare interview talking points based on the role requirements and your strengths

**Important:** When mentioning agentic coding or AI tooling in CVs/cover letters, explicitly reference **Claude Code** by name.

## Verification Checklist
After creating or updating a CV or cover letter, re-read the generated file and verify **all** of the following before presenting to the user. Report the results as a pass/fail checklist.

### Factual accuracy
- [ ] All claims match actual profile (CLAUDE.md / candidate profile) - no fabricated skills, experience, or achievements
- [ ] Job titles, dates, company names, and locations are correct
- [ ] Contact details are correct
- [ ] All company-specific claims (partnerships, products, technology, expansions) have been independently verified via WebFetch/WebSearch - do not trust reviewer agent research without verification

### Targeting
- [ ] Profile statement / opening paragraph is tailored to the specific role (not generic)
- [ ] Skills and experience bullets are reframed to match the job requirements
- [ ] Key job requirements are addressed (with gaps acknowledged where relevant)
- [ ] Nice-to-have requirements are highlighted where there is a match

### Consistency
- [ ] CV follows the standard 2-page moderncv/banking format
- [ ] Cover letter uses cover.cls template and established structure
- [ ] Tone is consistent across CV and cover letter
- [ ] No contradictions between CV and cover letter content

### Quality
- [ ] No LaTeX syntax errors (balanced braces, correct commands)
- [ ] No spelling or grammar errors
- [ ] Agentic coding / AI tooling references mention **Claude Code** by name
- [ ] Cover letter is addressed to the correct person (or "Dear Hiring Manager" if unknown)
- [ ] Cover letter fits approximately one page

### Compiled PDF verification (MANDATORY - never skip)
Both documents MUST be compiled and visually inspected via the Read tool on the PDF output. "Looks fine in the .tex" is not acceptable - LaTeX page-break decisions are unpredictable. Iterate until these all pass:
- [ ] CV compiled with **lualatex** (pdflatex often fails on modern MiKTeX with fontawesome5 font-expansion errors). Cover letter compiled with **xelatex** (cover.cls requires fontspec).
- [ ] **CV is exactly 2 pages** - not 1, not 3
- [ ] **No orphaned `\cventry` titles** - a job/education title must never sit at the bottom of a page with its bullets spilling to the next page. Use `\needspace{5\baselineskip}` before each `\cventry` to prevent this, and `\enlargethispage{2-3\baselineskip}` to rescue a trailing section that just barely spills
- [ ] **Cover letter is exactly 1 page** - signature block must fit with the body, never overflow
- [ ] **Cover letter bullet font matches body font** - `\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}` (the command's trailing `\\` errors on `\end{itemize}`, and moving itemize outside loses the Raleway font). Standard pattern: close `\lettercontent{}`, then wrap the list in `{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`

### ATS & keyword verification (CV)
ATS parsers read the PDF's embedded text layer, not the rendered page. Extract it with `pdftotext -layout` and verify what a parser sees. `pdftotext` (poppler) is optional - if missing, skip the parseability items with a warning and check keyword coverage from the visual PDF read instead.
- [ ] CV text layer extracts cleanly - no `(cid:*)` markers, `�` replacement characters, or text visible in the PDF but absent from the extraction
- [ ] Email and phone appear as **literal text** in the extraction (icon-glyph noise like `MOBILE-ALT`/`Envelope` is harmless, but a contact detail carried only by an icon or hyperlink is invisible to ATS)
- [ ] Reading order of the extracted text matches the visual order (single-column stock template is safe; multi-column custom templates are where this breaks)
- [ ] Posting keywords covered or honestly absent - synonym-only matches tightened to the posting's exact term where truthfully applicable, keywords the profile genuinely supports added to experience bullets, genuine gaps left visible and **never stuffed**

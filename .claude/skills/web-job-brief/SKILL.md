---
name: web-job-brief
description: >
  Fetches a public job URL and produces a structured brief (must-haves, keywords,
  salary, apply link) for the job-application-assistant. Triggers on: brief this job,
  parse this posting, job brief, extract keywords, /brief, Greenhouse, Lever, Ashby,
  career page URL, ATS keywords before CV
allowed-tools: Read, WebFetch, WebSearch, Grep, Glob, Write, AskUserQuestion
---

# Web Job Brief

Turn a public job posting URL (or pasted text) into a structured brief the
application assistant can use without re-reading the page.

## Invocation

- "Brief this job: `<url>`"
- "Parse this posting for keywords"
- `/brief <url>`
- User pastes a Greenhouse / Lever / Ashby / company career URL and wants a
  structured extract before `/apply`

Optional: "save the brief" to persist it under `job_briefs/`.

## Constraints

- Public pages only. No login walls, CAPTCHA bypass, or bulk scraping.
- If fetch fails (bot block or JS-only page), ask the user to paste the posting text.
- Never invent salary, requirements, or company claims. Mark unknowns as `unknown`.
- Ground fit notes in `CLAUDE.md` and
  `.claude/skills/job-application-assistant/01-candidate-profile.md`.
  Do not fabricate skills or tenure.
- Keep volume low on any ToS-restricted public job pages (same personal-use
  rule as `linkedin-search`).

## Steps

### Step 1: Load profile context

Read:

- `CLAUDE.md` (candidate profile, target sectors, deal-breakers)
- `.claude/skills/job-application-assistant/01-candidate-profile.md`

Do not re-fetch these if they are already in context.

### Step 2: Fetch the posting

1. If the input is a URL, `WebFetch` it.
2. If the page is thin or blocked, try one `WebSearch` for `"<role>" "<company>" job`
   and note that you used a fallback.
3. If still incomplete, ask the user to paste the full description and stop fetching.
4. If the input is already pasted text, skip fetch.

### Step 3: Extract fields

Fill every field in the output template. Use the posting's exact wording for
keywords when that wording is truthful for this candidate. Do not synonym-stuff.

Company-specific claims (products, funding, stack) stay `unknown` unless they
appear in the posting or a verified company page.

### Step 4: Output the brief

Always use this shape:

```markdown
# Job Brief: <Role> @ <Company>

| Field | Value |
|-------|-------|
| Source URL | … |
| Apply URL | … (or same as source) |
| Company | … |
| Role title | … |
| Location / remote | … |
| Employment type | FTE / contract / unknown |
| Salary / pay | stated range or `unknown` |
| Posted / closes | … or `unknown` |

## Must-haves
- …

## Nice-to-haves
- …

## ATS / posting keywords (exact terms)
- …

## Responsibilities (compressed)
- …

## Fit vs profile (1–5)
- Score: N/5
- Matches: …
- Gaps: … (honest; never stuffed)
- Verdict: apply / stretch / skip

## Application handoff
Ready for `job-application-assistant` / `/apply`:
- Suggested CV file: `cv/main_<company_slug>.tex`
- Suggested cover: `cover_letters/cover_<company_slug>_<role_slug>.tex`
- Top 5 keywords to mirror in bullets (only if the profile supports them): …
```

### Step 5: Optional persist

If the user asked to save the brief, write:

`job_briefs/<company-slug>-<role-slug>.md`

Slugify: lowercase, spaces to hyphens, strip special characters.
Confirm the path after writing. These files are gitignored.

### Step 6: Next step

Ask which path to take:

1. Full application (`/apply` / job-application-assistant: evaluate, CV, cover letter)
2. Freelance outreach (if the posting is a gig, not FTE)
3. Stop

Do not start drafting a CV or cover letter from this skill.

## Handoff

When the user chooses full application, invoke the **job-application-assistant**
workflow (or `/apply`) and pass the brief fields inline so it does not need to
re-fetch the posting unless the brief is missing must-haves.

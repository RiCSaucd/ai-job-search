---
name: productized-offer
description: >
  Turns repeated job or gig requirement patterns into a sellable 1-week
  automation package so the candidate can earn while job searching. Triggers on:
  productize this, what can I sell, 1-week automation package, productized offer,
  cash while searching, package this pain, offer page
allowed-tools: Read, WebFetch, WebSearch, Grep, Glob, Write, AskUserQuestion
---

# Productized Offer

Cash-while-searching: convert a requirement pattern into one fixed, 1-week package.

## Invocation

- "Productize this requirement pattern"
- "What can I sell from these job posts?"
- "Build a 1-week automation package for …"

## Inputs

Accept any of:

- Two or more job briefs / URLs showing the same pain
- A single detailed brief plus "turn into an offer"
- A niche (for example "dealership CRM follow-up" or "agency content SOP")

If URLs are given, `WebFetch` them (or reuse existing `job_briefs/` files).
If fetch fails, ask for pasted posting text.

## Grounding

Read `CLAUDE.md` and
`.claude/skills/job-application-assistant/01-candidate-profile.md`.

- Only sell what the profile can actually deliver.
- Name tools honestly: ChatGPT, Claude, **Claude Code**, CRM / Salesforce
  familiarity, SOP design. Do not invent enterprise implementations.
- Prefer fixed scope + fixed price + a clear "not included" list.
- No fake case studies. Use Volkswagen / NEXUS / Shultz metrics already in
  the profile, and only when they are relevant.
- If the pattern needs deep SOC or MSP tenure the profile lacks, narrow the
  offer or recommend skip.

## Steps

### Step 1: Spot the pattern

List the recurring pain in buyer language, not jargon. Cite the posts or briefs
used as evidence.

### Step 2: Design the 1-week package

Default shape:

- Day 1: discovery + workflow map
- Days 2-4: build (prompts, SOP, light automation)
- Day 5: handoff doc + walkthrough outline
- Buffer: revisions within scope

Name the offer with an outcome-first title.

### Step 3: Price frame

Propose one primary fixed price and one upsell. Label both as `suggestion`.
Tie price to hours saved or revenue protected when the profile supports that
claim. Do not present a number as verified market data.

### Step 4: Output

Always use this shape:

```markdown
## Pattern
- Buyer: …
- Pain: …
- Evidence (posts/briefs): …

## Offer name
<memorable, outcome-first name>

## 1-week package
| Day | Deliverable |
|-----|-------------|
| 1 | … |
| 2-4 | … |
| 5 | … |

**Includes:** …
**Does not include:** …
**Tools:** … (mention Claude Code if agentic build is involved)

## Pricing suggestion
- Core: $…
- Upsell: $… (for example 30-day async support)
- Positioning one-liner: …

## Sales assets (drafts)
1. 3-sentence LinkedIn/X post
2. 5-line DM (reuse freelance-outreach style)
3. Scope checklist for the kickoff call

## Job-search dual use
How this same package story strengthens FTE applications (which CV bullets to reuse).
```

### Step 5: Optional persist

If the user asked to save the offer, write:

`job_briefs/offer-<slug>.md`

Confirm the path. These files are gitignored.

### Step 6: Next step

Ask whether to:

1. Draft a send-ready DM via **freelance-outreach**
2. Keep iterating the package
3. Stop

Do not create fake client logos, testimonials, or case studies.

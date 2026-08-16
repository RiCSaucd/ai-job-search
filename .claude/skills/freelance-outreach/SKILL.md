---
name: freelance-outreach
description: >
  Turns a freelance or gig post into a 5-line pitch plus a rate suggestion
  grounded in the candidate profile. Triggers on: draft outreach, pitch this gig,
  freelance pitch, what should I charge, Upwork, Reddit forhire, X hiring post,
  agency inbound, DM this client
allowed-tools: Read, WebFetch, WebSearch, AskUserQuestion
---

# Freelance Outreach

Convert a gig post into a short, specific pitch the candidate can send the same day.

## Invocation

- "Pitch this gig: `<url or pasted text>`"
- "Draft outreach for …"
- "What should I charge for …"

## Profile anchors

Read `CLAUDE.md` and
`.claude/skills/job-application-assistant/01-candidate-profile.md`.

Lead with proof that maps to *this* gig. Typical anchors in this workspace:

- NEXUS AI Agency: AI workflows, SOPs, ChatGPT / Claude / Claude Code
- Volkswagen of St. Augustine: CRM follow-up, retention (+30%), revenue ($2M+),
  #1 salesperson five times
- Shultz and Lyman: Salesforce, B2B account growth
- Certs: CompTIA A+, Google Cybersecurity (only if the gig is IT/security-adjacent)

Never claim years of SOC or helpdesk tenure the profile does not have.
Follow `.claude/skills/job-application-assistant/03-writing-style.md` for the
pitch: no em-dashes, no cliches, no unbacked buzzwords.

## Steps

### Step 1: Capture the gig

From URL (`WebFetch`) or pasted text, note:

- Buyer need
- Deliverable
- Timeline
- Budget signal
- Channel (email, LinkedIn, Reddit, X, Upwork)

If the page is blocked, ask for a paste.

### Step 2: Choose one offer angle

Pick a single concrete outcome, not a tool laundry list. Examples that match
this profile when the gig supports them:

- CRM follow-up SOP plus AI draft replies
- Lead to nurture pipeline automation
- Content / ops SOPs with Claude Code assist
- Intake form to triage to follow-up workflow

If the gig needs deep security operations or MSP tenure the profile lacks,
say so and either narrow the pitch or recommend skip.

### Step 3: Rate suggestion

- If budget is stated: bid inside it with a clear package boundary.
- If unknown: prefer a **fixed package** over hourly. Label the number as
  `suggestion`, not a market fact.
- Offer a retainer alternative only when the buyer wants ongoing ops support.
- State assumptions (hours, revisions, tools they already have).

Do not invent case studies. Use only metrics already in the profile.

### Step 4: Output

Always use this shape:

```markdown
## Gig read
- Need: …
- Deliverable: …
- Timeline: …
- Budget signal: … / unknown
- Fit: high | medium | low (why)

## 5-line pitch (send-ready)
1. …
2. …
3. …
4. …
5. …

## Rate suggestion
- Package: <name> — <fixed price suggestion> — <what's included / not>
- Alt: hourly or retainer if they want ongoing
- Why this number: …

## CTA
One question that advances to a paid scope call.
```

## Pitch rules

- Exactly five lines in the pitch block.
- Mention **Claude Code** by name when agentic build work is part of the offer.
- CTA must be a specific next step (scope call, 15-minute workflow map), not
  "let me know if you are interested".
- Do not send or post the pitch; draft only.

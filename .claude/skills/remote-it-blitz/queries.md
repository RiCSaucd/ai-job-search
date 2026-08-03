# Query Bank — Entry-Level Remote IT

## Rule: short, literal titles only

Long natural-language queries degrade badly on job-board search. Observed failure:

```
"Technical Support Representative remote work from home"
  → Account Executive, Field Sales Rep, Databricks Sales Director, Inside Sales Rep …
```

Ten results, zero support roles. The engine matched "representative" and "remote" and
discarded the rest. Likewise `"IT Help Desk remote no experience CompTIA A+"` returned
**zero** results — every extra token narrows the match.

**Query with the job title alone.** Filter for entry-level and remote afterwards, in
Step 3, from the description text. Never encode "entry level", "no experience", "work
from home", or certification names into the query string.

---

## Priority 1 — core help desk / IT support

Highest-yield titles. Run all of them.

```
IT Support Specialist
Help Desk
Help Desk Technician
Service Desk Analyst
Technical Support Analyst
Technical Support Representative
Desktop Support
IT Support Technician
Tier 1 Technical Support
```

Indeed MCP call shape:

```
mcp__Indeed__search_jobs(search="Help Desk", location="remote",
                         country_code="US", job_type="fulltime")
```

LinkedIn CLI (local runs only — 403 in the web sandbox):

```bash
bun run .agents/skills/linkedin-search/cli/src/cli.ts \
  search -q "Help Desk" -l "United States" --remote remote --jobage 7 -n 12 --format json
```

## Priority 2 — adjacent titles that are functionally IT support

Often overlooked, and less competitive because IT candidates don't search them.

```
Technical Support Engineer I
Product Support Analyst
Application Support Analyst
Customer Support Specialist
Technical Customer Support
IT Operations Analyst
NOC Technician
Network Operations Technician
```

Screen these harder — "Customer Support Specialist" is frequently non-technical. Keep only
where the description names troubleshooting, ticketing, Windows/macOS, or networking.

## Priority 3 — profile-specific edges

Where the profile is differentiated rather than merely qualified. Lower volume, much
better conversion.

```
IT Support Salesforce
Technical Support CRM
Implementation Specialist
Onboarding Specialist technical
AI Automation Specialist
Workflow Automation Specialist
Technical Account Manager
```

The AI-automation practice and the Salesforce/CRM record are genuinely uncommon in an
entry-level IT applicant pool. Roles bridging support and CRM/automation should be scored
up, not treated as off-target.

## Priority 4 — junior security (stretch)

Google Cybersecurity Certificate supports these, but they are competitive at entry level.
Run only if Priority 1–3 under-fill the queue.

```
SOC Analyst I
Security Analyst I
Junior Security Analyst
Security Operations Analyst
IT Security Specialist
```

## Location parameters

| Search | `location` | Purpose |
|---|---|---|
| Remote (primary) | `remote` | Nationwide US remote |
| Florida fallback | `Florida` | Remote-in-FL and FL-restricted remote |
| Metro (with `--include-onsite`) | `Jacksonville, FL` · `St. Augustine, FL` | Commutable hybrid/on-site |

Always pass `country_code="US"`.

Remember Step 3a: `location: "remote"` **does not reliably return remote jobs**. Verified
example — a posting listed as `Nashville, TN` was fully remote US, while other results
tagged `Remote` were not. Confirm from the description, both directions.

## Recency

Target ≤7 days, accept ≤14. Postings older than ~30 days at entry level are usually
filled or ghost listings — Indeed results routinely surface roles 3–5 months old (e.g.
February and March dates in an August search), so **always check the posted date** and
drop stale ones rather than trusting result ordering.

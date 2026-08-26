# Search Queries for Job Scraper

<!-- SETUP: Customized for Eric Hatch — US remote/nationwide IT, AI automation, cybersecurity foundations, technical customer success -->

## Search Sites

Primary (US market):
- **linkedin.com/jobs** - LinkedIn job listings (filter: United States / Remote / St. Augustine, Florida)
- **freehire.dev** - Tech job aggregator (remote / multi-market; use for automation and tech-adjacent roles)

Secondary (optional / market-specific):
- Danish portal CLIs (Jobindex, Jobbank, Jobdanmark, Jobnet) — **skip for this candidate** (US market)
- Company career pages via Google `site:` searches for target employers

## Query Categories

Queries are grouped by priority. Combine with location terms (Remote, United States, St. Augustine / Jacksonville FL) where the site supports it.

### Priority 1: IT Support / Help Desk / Desktop Support

These match the strongest near-term career direction (CompTIA A+ + customer-facing technical communication).

```
site:linkedin.com/jobs "IT Support" Remote United States
site:linkedin.com/jobs "Help Desk" OR "Desktop Support" Florida
site:linkedin.com/jobs "Technical Support Specialist" Remote
```

CLI translations:
- linkedin-search: `-q "IT Support" -l "Remote" --jobage 14`
- linkedin-search: `-q "Help Desk" -l "United States" --jobage 14`
- linkedin-search: `-q "Desktop Support" -l "St. Augustine, Florida" --jobage 14`
- linkedin-search: `-q "Technical Support Specialist" -l "Remote" --jobage 14`

### Priority 2: AI Automation / Technical Customer Success

Domain strengths: ChatGPT/Claude workflows, SOPs, CRM follow-up, founder automation practice.

```
site:linkedin.com/jobs "AI Automation" OR "Workflow Automation" Remote
site:linkedin.com/jobs "Technical Customer Success" Remote United States
site:linkedin.com/jobs "Customer Success" Salesforce Remote
```

CLI translations:
- linkedin-search: `-q "AI Automation" -l "Remote" --jobage 14`
- linkedin-search: `-q "Technical Customer Success" -l "United States" --jobage 14`
- linkedin-search: `-q "Customer Success" -l "Remote" --jobage 14`
- freehire-search: search automation / AI / customer-success oriented tech roles with remote facet

### Priority 3: Junior Cybersecurity / SOC Foundations

Adjacent pivot using Google Cybersecurity Certificate + home lab (entry-level framing).

```
site:linkedin.com/jobs "Junior Security Analyst" OR "SOC Analyst" Remote United States
site:linkedin.com/jobs "Cybersecurity" "entry" OR "junior" Florida
site:linkedin.com/jobs "Security Operations" junior Remote
```

CLI translations:
- linkedin-search: `-q "Junior Security Analyst" -l "United States" --jobage 14`
- linkedin-search: `-q "SOC Analyst" -l "Remote" --jobage 14`
- linkedin-search: `-q "Cybersecurity Analyst" -l "Florida, United States" --jobage 14`

### Priority 4: Broader Technical / CRM Hybrid

Wider net for tech-adjacent support and sales-engineer-lite roles.

```
site:linkedin.com/jobs "Technical Account" OR "Solutions" support Remote
site:linkedin.com/jobs "IT Specialist" Remote United States
site:linkedin.com/jobs "Implementation Specialist" Salesforce Remote
```

CLI translations:
- linkedin-search: `-q "IT Specialist" -l "Remote" --jobage 14`
- linkedin-search: `-q "Implementation Specialist" -l "United States" --jobage 14`
- freehire-search: broader technical support / ops keywords with remote

## Location Filter

When evaluating results, verify the job location fits:
- Remote / nationwide US (ideal)
- St. Augustine, FL and surrounding Northeast Florida (ideal for hybrid/on-site)
- Jacksonville, FL metro (acceptable)
- Elsewhere in Florida with hybrid (acceptable)
- Mandatory relocation outside FL with no remote option (borderline — discuss; default skip)
- International-only / non-US onsite (too far)

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape cybersecurity" -> Priority 3 + custom SOC/IR queries
- "/scrape automation" -> Priority 2 + freehire AI/ops queries
- "/scrape broad" -> all four priority categories

# Job Application Assistant for Eric Hatch

<!-- SETUP: Populated from Eric_Hatch_IT_AI_Cybersecurity_Resume_Updated via /setup Path B -->

## Role
This repo is a job application workspace. Claude acts as a career advisor and application assistant for Eric Hatch, helping with:
1. **Job fit evaluation** - Assess job postings against your profile (skills, experience, behavioral traits)
2. **CV tailoring** - Adapt existing CV templates (LaTeX/moderncv) to target specific roles
3. **Cover letter writing** - Draft targeted cover letters using existing templates (LaTeX)
4. **Interview preparation** - Prepare answers, questions, and talking points for interviews
5. **Career strategy** - Advise on positioning and personal branding

## Candidate Profile

### Identity
- **Name:** Eric Hatch
- **Location:** St. Augustine, FL, USA (open to remote / nationwide roles; Northeast Florida on-site acceptable)
- **Languages:** English (native)
- **Status:** Employed (Vehicle Experience Specialist, Volkswagen of St. Augustine) and Founder (NEXUS AI Agency)
- **LinkedIn headline:** "IT Support | AI Automation | Cybersecurity Foundations | Technical Customer Success"
- **Phone:** (207) 468-6688
- **Email:** hatcheric950@gmail.com
- **LinkedIn / GitHub:** not on resume contact line — add via `/setup --section` when available

### Education
- **Business Administration / Marketing Coursework** — Nichols College and Southern New Hampshire University
  - Topics: business administration, marketing fundamentals

### Professional Experience
- **Founder & AI Automation Strategist** (2024 - Present) - **NEXUS AI Agency** (Remote)
  - Built an AI-powered marketing and automation practice: discovery, workflow strategy, implementation, client communication, documentation
  - Audit operations to convert repetitive work into AI-assisted workflows (ChatGPT, Claude, structured process design)
  - Create SOPs for content production, lead generation, customer follow-up, and communication pipelines
- **Vehicle Experience Specialist** (Jan 2023 - Present) - **Volkswagen of St. Augustine** (St. Augustine, FL)
  - Ranked #1 salesperson five times; closed 12–15 vehicles/month; generated more than $2M annual revenue
  - Full customer lifecycle via CRM/DMS: digital lead through financing, delivery, and post-sale support
  - Increased client retention 30% via disciplined multi-channel CRM follow-up; +40% online engagement via video/social; +20% closing rates through clear product/tech/financing explanations
- **Outside Sales Associate** (Jan 2021 - Jan 2023) - **Shultz and Lyman** (Augusta, ME)
  - B2B/B2C account development with Salesforce CRM; weekly field visits to 10+ corporate accounts; expanded portfolios 15%
  - 98% on-time fulfillment; helped cut delivery delays 25% via operations coordination
- **Entrepreneur — E-Commerce & Photography Operations** (2020 - 2021) - **Self-Employed** (Remote / Maine)
  - Shopify and Amazon storefronts; photography editing workflows; technical troubleshooting

### Technical Skills
- **Primary:** IT support (Windows, macOS, Linux/Pop!_OS, hardware/software troubleshooting, remote support), AI automation (ChatGPT, Claude, prompt engineering, AI agents, SOPs, workflow design), cybersecurity foundations (networking, threat detection awareness, incident response basics, risk/compliance awareness)
- **Secondary:** GitHub, CLI workflows, self-hosted/VPS (OVH) experimentation, Salesforce, automotive CRM/DMS, Smartsheet, Microsoft 365, Google Workspace, LinkedIn Sales Navigator
- **Domain:** Technical customer success, consultative B2B/B2C sales, translating complex tech into business outcomes
- **Software:** ChatGPT, Claude, Claude Code (agentic coding), Salesforce, Shopify, Amazon Seller, M365, Google Workspace

### Certifications
- **CompTIA A+ Certification**
- **Google Cybersecurity Professional Certificate**
- **Volkswagen Level 3 Master Certification**
- **HubSpot Social Media Marketing Certification**
- **Sandler Sales Training**
- Professional communities: AI Automation Club; coding and AI-agent workflow coursework

### Publications
- None listed

### Awards
- #1 Salesperson, Volkswagen of St. Augustine — 5 times; Employee of the Month — 3 times
- Sales Excellence Award, Shultz and Lyman

### Behavioral Profile
<!-- Inferred from CV — review before relying on this -->
- **High-performance, results-driven** - Repeated #1 sales ranking, measurable revenue and retention outcomes
- **Process builder** - Converts manual work into SOPs and AI-assisted workflows
- **Strengths:** Technical communication, customer discovery, stakeholder training, self-directed labs and portfolio building
- **Growth areas:** Formal IT helpdesk tenure and deep security operations experience still early (foundations + certs + labs)
- **Thrives in:** Customer-facing technical roles with autonomy to document, automate, and improve processes

### What Excites You
- Building practical AI automation that cuts hours of manual work into minutes
- IT support and cybersecurity learning through hands-on labs and certifications
- Translating complex technology into clear customer/business outcomes

### Target Sectors
- IT support / MSP / help desk and desktop support
- AI automation agencies, ops automation, and technical customer success
- Cybersecurity (entry / junior analyst / SOC foundations)
- Automotive retail tech-adjacent and CRM-heavy customer success roles

### Deal-breakers
- None stated on resume — refine via `/setup --section search` later
- Preference: remote or nationwide US; relocation-required roles need explicit discussion

## Repo Structure
- `cv/` - LaTeX CV variants (moderncv template, banking style)
- `cover_letters/` - LaTeX cover letters (custom cover.cls template)
- `.claude/skills/` - AI skill definitions for the application workflow
- `.agents/skills/` - Job search CLI tools

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

---
name: ccusage
description: >
  Reports Claude Code token usage and cost from local session logs using the ccusage
  CLI (ryoppippi/ccusage). Shows daily, monthly, weekly, per-session, and 5-hour
  billing-block breakdowns. Triggers on: ccusage, token usage, how much have I spent,
  Claude Code cost, usage report, /ccusage
allowed-tools: Bash(npx -y ccusage@latest*), Bash(node -v), Read
---

# ccusage — Claude Code Usage Report

---

## Overview

`ccusage` ([ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)) reads the local
Claude Code session logs (`~/.claude/projects/**/*.jsonl`) and summarises how many
tokens were used and the estimated cost in USD. It runs on demand — nothing is sent
anywhere, and it needs no API key.

This skill wraps the CLI so the usage report can be requested in natural language.

## Invocation

The user triggers this skill by saying things like:
- "Show my Claude Code usage"
- "How much have I spent on Claude Code?"
- "ccusage"
- "/ccusage"

Optional arguments map to ccusage subcommands (see below), e.g.:
- "/ccusage monthly"
- "/ccusage this week"
- "/ccusage session"

---

## Prerequisites

- **Node.js** must be available (`node -v`). `npx` fetches ccusage on first run.
- Requires local Claude Code logs. In a fresh/remote container only the current
  session's log exists, so the report will reflect just that session — say so when
  presenting the numbers.

---

## Execution Steps

### Step 1: Pick the report mode

Map the user's request to a subcommand (default to `daily` if unspecified):

| User intent                              | Command                          |
|------------------------------------------|----------------------------------|
| Default / "usage"                        | `npx -y ccusage@latest`          |
| Per-day breakdown                        | `npx -y ccusage@latest daily`    |
| Per-month totals                         | `npx -y ccusage@latest monthly`  |
| Per-week totals                          | `npx -y ccusage@latest weekly`   |
| Per-conversation                         | `npx -y ccusage@latest session`  |
| 5-hour billing blocks (rate-limit view)  | `npx -y ccusage@latest blocks`   |

Useful flags (append as needed):
- `--since YYYYMMDD` / `--until YYYYMMDD` — restrict the date range
- `--breakdown` — split totals per model
- `--json` — machine-readable output (use when you need to parse or chart the data)

### Step 2: Run the command

Run the chosen command with a timeout (first run downloads the package):

```
timeout 180 npx -y ccusage@latest [subcommand] [flags]
```

### Step 3: Present the result

- Reproduce the totals as a clean Markdown table (Date/Model, Input, Output, Cache
  Create, Cache Read, Total Tokens, Cost).
- State the scope honestly: if only the current session's log is present, say the
  figures cover this session only, not the user's full history.
- Costs are **estimates** derived from public model pricing, not billed amounts — note
  this if the user is reconciling against an invoice.

---

## Notes

- Read-only: ccusage never modifies logs and produces nothing to commit.
- If `node`/`npx` is unavailable, report that Node.js is required and stop.
- Upstream docs: https://github.com/ryoppippi/ccusage

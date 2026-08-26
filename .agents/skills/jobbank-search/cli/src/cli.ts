#!/usr/bin/env bun
// Self-contained CLI for Akademikernes Jobbank (jobbank.dk) — job search for
// highly educated candidates. No external CLI framework and zero runtime
// dependencies, so it runs anywhere `bun` is available with nothing installed
// beyond the repo clone.
//
// Data sources: the public RSS feed (search) and job-page JSON-LD (detail).
// Jobbank may block automated requests with Cloudflare bot protection; the CLI
// then exits with a clear error so callers can fall back to WebSearch.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

// Flags that may repeat (and accept comma-separated values); collected as arrays.
const REPEATABLE = new Set(["type", "education", "location", "work-area", "industry", "suitable-for"])

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const key = a.replace(/^-+/, "")
    const next = argv[i + 1]
    // A flag with no following value (or another flag next) is a boolean.
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    if (REPEATABLE.has(key)) {
      const acc = Array.isArray(flags[key]) ? (flags[key] as string[]) : []
      if (typeof value === "string") acc.push(value)
      flags[key] = acc
    } else {
      flags[key] = value
    }
  }
  return flags
}

type FlagValue = string | boolean | string[] | undefined

/** A flag's string value; a bare flag (set without a value) yields undefined. */
function stringFlag(raw: FlagValue): string | undefined {
  return typeof raw === "string" ? raw : undefined
}

/** Split a repeatable flag's collected values on commas into one trimmed list. */
function multiFlag(raw: FlagValue): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean)
}

const HELP = `jobbank-cli — search Akademikernes Jobbank (jobbank.dk, Denmark)

USAGE
  bun run src/cli.ts search [flags] [--format json|table|plain]
  bun run src/cli.ts detail <id> [--format json|plain]

SEARCH FLAGS (at least one filter is required)
  --key <text>            Keyword search (title, company, keyword).
  --exclude <text>        Exclude keywords (antikey).
  --type <code>           Job type (cvtype), e.g. 3=Fuldtidsjob, 6=Graduate/trainee.
                          Repeatable or comma-separated: --type 3 --type 6, --type 3,6.
  --education <code>      Education field (udd). Repeatable/comma-separated.
  --location <code>       Region (amt), e.g. 2=Storkøbenhavn. Repeatable/comma-separated.
  --work-area <code>      Work area / function (erf). Repeatable/comma-separated.
  --industry <code>       Industry (branche). Repeatable/comma-separated.
  --suitable-for <code>   Suitable-for (andet), e.g. 2=Nyuddannede. Repeatable/comma-separated.
  --company <id>          Company ID (virk).
  --remote <mode>         helt (fully remote) | delvist (partially remote).
  --since <date>          Posted on or after YYYY-MM-DD (oprettet).
  --limit <n>             Cap results returned by the CLI (client-side).
  --format <fmt>          json (default) | table | plain.

DETAIL
  <id>                    Numeric job ID from a search result's id field.

EXAMPLES
  bun run src/cli.ts search --key "data scientist" --location 2 --format table
  bun run src/cli.ts search --type 6 --suitable-for 2 --format table
  bun run src/cli.ts search --industry 10331 --work-area 31 --remote helt
  bun run src/cli.ts detail 1234567 --format plain

Filter codes are documented in README.md. The RSS feed returns at most 100
items; meta.total carries the true count. Jobbank may block automated requests
with Cloudflare bot protection — the CLI reports that clearly and callers
should fall back to WebSearch rather than retrying.
`

function parseIntFlag(name: string, raw: string | boolean | string[]): number | null {
  const val = parseInt(raw as string, 10)
  if (isNaN(val)) {
    process.stderr.write(JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"

    for (const name of ["company", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    const opts: SearchOpts = {
      key: stringFlag(flags.key),
      exclude: stringFlag(flags.exclude),
      type: multiFlag(flags.type),
      education: multiFlag(flags.education),
      location: multiFlag(flags.location),
      workArea: multiFlag(flags["work-area"]),
      industry: multiFlag(flags.industry),
      suitableFor: multiFlag(flags["suitable-for"]),
      company: stringFlag(flags.company),
      remote: stringFlag(flags.remote),
      since: stringFlag(flags.since),
      limit: flags.limit !== undefined ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "Job ID is required", code: "MISSING_REQUIRED" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))

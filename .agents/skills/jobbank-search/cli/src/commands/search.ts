import { rssFetch, fetchWithUA, writeError, parseRssDescription, extractJobIdFromUrl, BASE_URL } from "../helpers.js"

export interface SearchOpts {
  key?: string
  exclude?: string
  // Multi-value filter codes (already split on commas; empty means unset).
  type: string[]
  education: string[]
  location: string[]
  workArea: string[]
  industry: string[]
  suitableFor: string[]
  company?: string
  remote?: string // helt | delvist
  since?: string // YYYY-MM-DD
  limit?: number // client-side cap on returned results
  format: "json" | "table" | "plain"
}

interface SearchResult {
  id: string
  title: string
  company: string
  location: string
  jobType: string
  description: string
  url: string
  posted: string
  deadline: string | null
}

/** Map the parsed flags onto Jobbank's RSS query params (cvtype, amt, ...). */
function buildParams(opts: SearchOpts): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {}
  if (opts.key) params["key"] = opts.key
  if (opts.exclude) params["antikey"] = opts.exclude
  if (opts.type.length) params["cvtype"] = opts.type
  if (opts.education.length) params["udd"] = opts.education
  if (opts.location.length) params["amt"] = opts.location
  if (opts.workArea.length) params["erf"] = opts.workArea
  if (opts.industry.length) params["branche"] = opts.industry
  if (opts.suitableFor.length) params["andet"] = opts.suitableFor
  if (opts.company !== undefined) params["virk"] = opts.company
  if (opts.remote) params["fjernarbejde"] = opts.remote
  if (opts.since) params["oprettet"] = opts.since
  return params
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  const params = buildParams(opts)

  // Require at least one filter — an unfiltered RSS pull is never intended.
  if (Object.keys(params).length === 0) {
    writeError("--key or at least one filter is required", "MISSING_REQUIRED")
    return 1
  }

  try {
    // Fetch RSS feed
    const items = await rssFetch(params)

    // Also fetch total count from HTML page (secondary request)
    let total: number | null = null
    try {
      // Small delay to be polite
      await new Promise((resolve) => setTimeout(resolve, 300))
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          for (const v of value) searchParams.append(key, v)
        } else {
          searchParams.append(key, value)
        }
      }
      const htmlResp = await fetchWithUA(`${BASE_URL}/job/?${searchParams.toString()}`)
      if (htmlResp.ok) {
        const html = await htmlResp.text()
        // Extract from <title> tag: "457 relevante job og karriereopslag i Akademikernes Jobbank"
        const titleMatch = html.match(/<title[^>]*>\s*(\d[\d.,]*)\s+relevante job/i)
        if (titleMatch) {
          total = parseInt(titleMatch[1].replace(/[.,]/g, ""), 10)
        }
      }
    } catch {
      // Secondary request failed — total stays null
    }

    // Normalize items
    let results: SearchResult[] = items.map((item) => {
      const parsed = parseRssDescription(item.description)
      return {
        id: extractJobIdFromUrl(item.link),
        title: item.title,
        company: parsed.company,
        location: parsed.location,
        jobType: parsed.jobType,
        description: item.description,
        url: item.link,
        posted: item.pubDate ? new Date(item.pubDate).toISOString() : "",
        deadline: parsed.deadline,
      }
    })

    // Apply limit
    if (opts.limit !== undefined) {
      results = results.slice(0, opts.limit)
    }

    if (opts.format === "json") {
      console.log(JSON.stringify({ meta: { total }, results }, null, 2))
    } else if (opts.format === "table") {
      outputTable(results)
    } else {
      outputPlain(results)
    }
    return 0
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err), "API_ERROR")
    return 1
  }
}

function outputTable(results: SearchResult[]): void {
  console.log("id        title                                company                location           deadline")
  for (const r of results) {
    const id = r.id.padEnd(9)
    const title = r.title.substring(0, 36).padEnd(36)
    const company = r.company.substring(0, 22).padEnd(22)
    const location = r.location.substring(0, 18).padEnd(18)
    const deadline = r.deadline ?? "-"
    console.log(`${id} ${title} ${company} ${location} ${deadline}`)
  }
}

function outputPlain(results: SearchResult[]): void {
  for (const r of results) {
    console.log(`id: ${r.id}`)
    console.log(`title: ${r.title}`)
    console.log(`company: ${r.company}`)
    console.log(`location: ${r.location}`)
    console.log(`jobType: ${r.jobType}`)
    console.log(`posted: ${r.posted}`)
    console.log(`deadline: ${r.deadline ?? "none"}`)
    console.log(`url: ${r.url}`)
    console.log("")
  }
}

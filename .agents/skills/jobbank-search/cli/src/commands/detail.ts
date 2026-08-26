import { fetchWithUA, writeError, extractJobPosting, BASE_URL } from "../helpers.js"

export interface DetailOpts {
  id: string // numeric job ID from a search result
  format: "json" | "plain"
}

interface DetailResult {
  id: string
  url: string
  title: string
  description: string
  datePosted: string
  deadline: string | null
  employmentType: string[]
  company: { name: string; logo: string | null }
  location: { streetAddress: string; city: string; postalCode: string; country: string }
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = `${BASE_URL}/job/${opts.id}/`

  try {
    const response = await fetchWithUA(url)

    if (response.status === 404) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }

    if (!response.ok) {
      writeError(`Failed to fetch job page: ${response.status} ${response.statusText}`, "API_ERROR")
      return 1
    }

    const html = await response.text()

    // The job page embeds a Schema.org JobPosting as JSON-LD.
    const jobPosting = extractJobPosting(html)
    if (!jobPosting) {
      writeError("No JSON-LD found on job page", "PARSE_ERROR")
      return 1
    }

    // Extract fields
    const identifier = jobPosting["identifier"] as Record<string, unknown> | undefined
    const jobId = identifier?.["value"] ? String(identifier["value"]) : opts.id

    const hiringOrg = jobPosting["hiringOrganization"] as Record<string, unknown> | undefined
    const jobLocation = jobPosting["jobLocation"] as Record<string, unknown> | undefined
    const address = (jobLocation?.["address"] as Record<string, unknown>) ?? {}

    const employmentType = jobPosting["employmentType"]
    const empTypeArr: string[] = Array.isArray(employmentType)
      ? employmentType.map(String)
      : employmentType
      ? [String(employmentType)]
      : []

    const validThrough = jobPosting["validThrough"]
    let deadline: string | null = null
    if (validThrough && String(validThrough).length > 0) {
      // Normalize to YYYY-MM-DD if it's an ISO datetime
      deadline = String(validThrough).substring(0, 10) // take first 10 chars = YYYY-MM-DD
      if (deadline === "0001-01-01") deadline = null // invalid date
    }

    const output: DetailResult = {
      id: jobId,
      url: String(jobPosting["url"] ?? url),
      title: String(jobPosting["title"] ?? ""),
      description: String(jobPosting["description"] ?? ""),
      datePosted: String(jobPosting["datePosted"] ?? ""),
      deadline,
      employmentType: empTypeArr,
      company: {
        name: String(hiringOrg?.["name"] ?? ""),
        logo: hiringOrg?.["logo"] ? String(hiringOrg["logo"]) : null,
      },
      location: {
        streetAddress: String(address["streetAddress"] ?? ""),
        city: String(address["addressLocality"] ?? ""),
        postalCode: String(address["postalCode"] ?? ""),
        country: String(address["addressCountry"] ?? ""),
      },
    }

    if (opts.format === "json") {
      console.log(JSON.stringify(output, null, 2))
    } else {
      outputPlain(output)
    }
    return 0
  } catch (err) {
    writeError(err instanceof Error ? err.message : String(err), "API_ERROR")
    return 1
  }
}

function outputPlain(data: DetailResult): void {
  console.log(`id: ${data.id}`)
  console.log(`title: ${data.title}`)
  console.log(`company: ${data.company.name}`)
  if (data.company.logo) console.log(`logo: ${data.company.logo}`)
  console.log(`location: ${[data.location.streetAddress, data.location.city, data.location.country].filter(Boolean).join(", ")}`)
  console.log(`datePosted: ${data.datePosted}`)
  console.log(`deadline: ${data.deadline ?? "none"}`)
  console.log(`employmentType: ${data.employmentType.join(", ")}`)
  console.log(`url: ${data.url}`)
  console.log("")
  // Strip HTML tags for plain description
  const plainDescription = data.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  console.log(plainDescription)
}

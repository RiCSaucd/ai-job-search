import { describe, test, expect } from "bun:test";
import { extractJobPosting, parseRssDescription, extractJobIdFromUrl } from "../src/helpers";

describe("extractJobPosting — JSON-LD from job-page HTML", () => {
  const posting = { "@type": "JobPosting", title: "Senior Data Scientist" };

  test("finds a bare JobPosting object", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify(posting)}</script></head></html>`;
    expect(extractJobPosting(html)?.title).toBe("Senior Data Scientist");
  });

  test("finds a JobPosting inside an array", () => {
    const html = `<script type="application/ld+json">${JSON.stringify([{ "@type": "BreadcrumbList" }, posting])}</script>`;
    expect(extractJobPosting(html)?.title).toBe("Senior Data Scientist");
  });

  test("skips non-JobPosting blocks and finds a later one", () => {
    const html = [
      `<script type="application/ld+json">${JSON.stringify({ "@type": "Organization" })}</script>`,
      `<script type="application/ld+json">${JSON.stringify(posting)}</script>`,
    ].join("\n");
    expect(extractJobPosting(html)?.title).toBe("Senior Data Scientist");
  });

  test("skips blocks that are not valid JSON", () => {
    const html = [
      `<script type="application/ld+json">{not json</script>`,
      `<script type="application/ld+json">${JSON.stringify(posting)}</script>`,
    ].join("\n");
    expect(extractJobPosting(html)?.title).toBe("Senior Data Scientist");
  });

  test("tolerates extra script attributes and single quotes", () => {
    const html = `<script id="jsonld" type='application/ld+json' data-x="1">${JSON.stringify(posting)}</script>`;
    expect(extractJobPosting(html)?.title).toBe("Senior Data Scientist");
  });

  test("returns null when no JSON-LD JobPosting is present", () => {
    expect(extractJobPosting("<html><body>plain page</body></html>")).toBeNull();
    expect(extractJobPosting(`<script type="application/ld+json">{"@type":"WebSite"}</script>`)).toBeNull();
  });
});

describe("parseRssDescription — 'JobType hos Company, Location (Ansøgningsfrist: ...)'", () => {
  test("parses the standard single-type form", () => {
    const p = parseRssDescription("Fuldtidsjob hos Novo Nordisk, Bagsværd (Ansøgningsfrist: 12.04.2026)");
    expect(p).toEqual({
      jobType: "Fuldtidsjob",
      company: "Novo Nordisk",
      location: "Bagsværd",
      deadline: "12.04.2026",
    });
  });

  test("keeps multiple job types together", () => {
    const p = parseRssDescription("Fuldtidsjob, Graduate/trainee hos DTU, Lyngby (Ansøgningsfrist: 01.05.2026)");
    expect(p.jobType).toBe("Fuldtidsjob, Graduate/trainee");
    expect(p.company).toBe("DTU");
    expect(p.location).toBe("Lyngby");
  });

  test("a 'løbende' deadline becomes null", () => {
    const p = parseRssDescription("Fuldtidsjob hos DTU, Lyngby (Ansøgningsfrist: løbende)");
    expect(p.deadline).toBeNull();
  });

  test("falls back to treating the whole text as company when ' hos ' is absent", () => {
    const p = parseRssDescription("Something unstructured");
    expect(p).toEqual({ jobType: "", company: "Something unstructured", location: "", deadline: null });
  });
});

describe("extractJobIdFromUrl", () => {
  test("extracts the numeric segment after /job/", () => {
    expect(extractJobIdFromUrl("https://jobbank.dk/job/1234567/novo-nordisk/senior-data-scientist")).toBe("1234567");
  });

  test("returns empty string when no ID is present", () => {
    expect(extractJobIdFromUrl("https://jobbank.dk/jobs")).toBe("");
  });
});

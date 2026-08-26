import { afterEach, describe, expect, test } from "bun:test";
import { runSearch, type SearchOpts } from "../src/commands/search";
import { runDetail } from "../src/commands/detail";

const originalFetch = globalThis.fetch;
const originalLog = console.log;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
});

function captureStdout(): { get: () => string } {
  let buf = "";
  console.log = (...args: unknown[]) => {
    buf += args.map(String).join(" ") + "\n";
  };
  return { get: () => buf };
}

function captureStderr(): { get: () => string; restore: () => void } {
  let buf = "";
  const orig = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    buf += chunk.toString();
    return true;
  }) as typeof process.stderr.write;
  return { get: () => buf, restore: () => (process.stderr.write = orig) };
}

const RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
<title><![CDATA[Senior Data Scientist]]></title>
<description><![CDATA[Fuldtidsjob hos Novo Nordisk, Bagsværd (Ansøgningsfrist: 12.04.2026)]]></description>
<link>https://jobbank.dk/job/1234567/novo-nordisk/senior-data-scientist</link>
<pubDate>Mon, 02 Mar 2026 00:00:00 +0100</pubDate>
</item>
</channel></rss>`;

const SEARCH_HTML = `<html><head><title>457 relevante job og karriereopslag i Akademikernes Jobbank</title></head></html>`;

const DETAIL_HTML = `<html><head><script type="application/ld+json">${JSON.stringify({
  "@type": "JobPosting",
  identifier: { value: 1234567 },
  url: "https://jobbank.dk/job/1234567/novo-nordisk/senior-data-scientist",
  title: "Senior Data Scientist",
  description: "<p>Build models.</p>",
  datePosted: "2026-03-02",
  validThrough: "2026-04-12T23:59:59",
  employmentType: ["FULL_TIME"],
  hiringOrganization: { name: "Novo Nordisk", logo: "https://jobbank.dk/logo.png" },
  jobLocation: { address: { streetAddress: "", addressLocality: "Bagsværd", postalCode: "2880", addressCountry: "DK" } },
})}</script></head></html>`;

/** Route mocked responses by URL: the RSS feed vs. the HTML search/detail page. */
function mockRoutes(routes: Array<{ match: string; status: number; body: string }>): void {
  globalThis.fetch = (async (input: Request | string | URL) => {
    const url = String(input);
    for (const route of routes) {
      if (url.includes(route.match)) {
        return new Response(route.body, { status: route.status });
      }
    }
    return new Response("not mocked", { status: 404 });
  }) as unknown as typeof fetch;
}

const searchOpts: SearchOpts = {
  key: "data",
  type: [],
  education: [],
  location: [],
  workArea: [],
  industry: [],
  suitableFor: [],
  format: "json",
};

describe("runSearch (mocked fetch)", () => {
  test("emits {meta: {total}, results} with parsed RSS fields", async () => {
    mockRoutes([
      { match: "/job/rss", status: 200, body: RSS_XML },
      { match: "/job/?", status: 200, body: SEARCH_HTML },
    ]);
    const out = captureStdout();

    const code = await runSearch(searchOpts);
    expect(code).toBe(0);

    const parsed = JSON.parse(out.get());
    expect(parsed.meta.total).toBe(457);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0]).toMatchObject({
      id: "1234567",
      title: "Senior Data Scientist",
      company: "Novo Nordisk",
      location: "Bagsværd",
      jobType: "Fuldtidsjob",
      url: "https://jobbank.dk/job/1234567/novo-nordisk/senior-data-scientist",
      deadline: "12.04.2026",
    });
    expect(parsed.results[0].posted).toBe(new Date("Mon, 02 Mar 2026 00:00:00 +0100").toISOString());
  });

  test("meta.total is null when the secondary HTML request fails", async () => {
    let calls = 0;
    globalThis.fetch = (async (input: Request | string | URL) => {
      calls++;
      const url = String(input);
      if (url.includes("/job/rss")) return new Response(RSS_XML, { status: 200 });
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const out = captureStdout();

    const code = await runSearch(searchOpts);
    expect(code).toBe(0);
    expect(calls).toBe(2);
    expect(JSON.parse(out.get()).meta.total).toBeNull();
  });

  test("--limit caps results client-side", async () => {
    const twoItems = RSS_XML.replace(
      "</channel>",
      `<item><title><![CDATA[Second]]></title><description><![CDATA[Studiejob hos Acme, Odense (Ansøgningsfrist: løbende)]]></description><link>https://jobbank.dk/job/7654321/acme/second</link><pubDate>Tue, 03 Mar 2026 00:00:00 +0100</pubDate></item></channel>`,
    );
    mockRoutes([
      { match: "/job/rss", status: 200, body: twoItems },
      { match: "/job/?", status: 200, body: SEARCH_HTML },
    ]);
    const out = captureStdout();

    const code = await runSearch({ ...searchOpts, limit: 1 });
    expect(code).toBe(0);
    expect(JSON.parse(out.get()).results).toHaveLength(1);
  });

  test("no filters exits 1 with MISSING_REQUIRED before any fetch", async () => {
    let fetched = false;
    globalThis.fetch = (async () => {
      fetched = true;
      return new Response("", { status: 200 });
    }) as unknown as typeof fetch;
    const err = captureStderr();

    const code = await runSearch({ ...searchOpts, key: undefined });
    err.restore();

    expect(code).toBe(1);
    expect(fetched).toBe(false);
    expect(JSON.parse(err.get()).code).toBe("MISSING_REQUIRED");
  });

  test("network failure exits 1 with API_ERROR", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const err = captureStderr();

    const code = await runSearch(searchOpts);
    err.restore();

    expect(code).toBe(1);
    expect(JSON.parse(err.get()).code).toBe("API_ERROR");
  });
});

describe("runDetail (mocked fetch)", () => {
  test("prints the JobPosting fields mapped to the contract shape", async () => {
    mockRoutes([{ match: "/job/1234567/", status: 200, body: DETAIL_HTML }]);
    const out = captureStdout();

    const code = await runDetail({ id: "1234567", format: "json" });
    expect(code).toBe(0);

    const parsed = JSON.parse(out.get());
    expect(parsed).toMatchObject({
      id: "1234567",
      title: "Senior Data Scientist",
      datePosted: "2026-03-02",
      deadline: "2026-04-12",
      employmentType: ["FULL_TIME"],
      company: { name: "Novo Nordisk", logo: "https://jobbank.dk/logo.png" },
      location: { streetAddress: "", city: "Bagsværd", postalCode: "2880", country: "DK" },
    });
  });

  test("404 exits 1 with NOT_FOUND", async () => {
    mockRoutes([{ match: "/job/", status: 404, body: "gone" }]);
    const err = captureStderr();

    const code = await runDetail({ id: "999", format: "json" });
    err.restore();

    expect(code).toBe(1);
    expect(JSON.parse(err.get()).code).toBe("NOT_FOUND");
  });

  test("a page without JSON-LD exits 1 with PARSE_ERROR", async () => {
    mockRoutes([{ match: "/job/", status: 200, body: "<html><body>no structured data</body></html>" }]);
    const err = captureStderr();

    const code = await runDetail({ id: "1234567", format: "json" });
    err.restore();

    expect(code).toBe(1);
    expect(JSON.parse(err.get()).code).toBe("PARSE_ERROR");
  });
});

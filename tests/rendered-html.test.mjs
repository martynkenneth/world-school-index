import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the global coverage roadmap", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>World School Index/i);
  assert.match(html, /Find the right international school, anywhere\./);
  assert.match(html, /Global coverage roadmap/);
  assert.match(html, /Vietnam and Thailand live\. Southeast Asia next\./);
  assert.match(html, /Thailand/);
  assert.match(html, /Singapore/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships normalized entities in the public data export", async () => {
  const [layout, packageJson, dataExport] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../public/data/vietnam-schools.json", import.meta.url), "utf8"),
  ]);

  const parsed = JSON.parse(dataExport);
  assert.equal(parsed.schemaVersion, "2.0");
  assert.equal(parsed.recordCount, 22);
  assert.equal(parsed.entities.schools.length, 22);
  assert.equal(parsed.entities.campuses.length, 22);
  assert.equal(parsed.entities.sources.length, 22);
  assert.equal(parsed.entities.verifications.length, 22);
  assert.ok(parsed.records.every((record) => !("summary" in record)));
  assert.match(layout, /World School Index/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|themeColor|\bViewport\b/);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});

test("ships the first source-checked Thailand collection", async () => {
  const dataExport = await readFile(
    new URL("../public/data/thailand-schools.json", import.meta.url),
    "utf8",
  );
  const parsed = JSON.parse(dataExport);
  assert.equal(parsed.schemaVersion, "2.0");
  assert.equal(parsed.recordCount, 28);
  assert.equal(parsed.entities.schools.length, 28);
  assert.equal(parsed.entities.campuses.length, 28);
  assert.equal(parsed.entities.sources.length, 28);
  assert.equal(parsed.entities.verifications.length, 28);
});

test("keeps the Vietnam country directory available", async () => {
  const response = await render("/countries/vietnam");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>International Schools in Vietnam/);
  assert.match(html, /22/);
  assert.match(html, /href="\/data\/vietnam-schools\.json"/);
});

test("renders the Thailand country directory and a Thailand school record", async () => {
  const [countryResponse, schoolResponse] = await Promise.all([
    render("/countries/thailand"),
    render("/schools/international-school-bangkok"),
  ]);
  assert.equal(countryResponse.status, 200);
  assert.equal(schoolResponse.status, 200);

  const countryHtml = await countryResponse.text();
  assert.match(countryHtml, /<title>International Schools in Thailand/);
  assert.match(countryHtml, /28/);
  assert.match(countryHtml, /href="\/data\/thailand-schools\.json"/);
  assert.match(countryHtml, /Bangkok/);
  assert.match(countryHtml, /Chiang Mai/);
  assert.match(countryHtml, /Phuket/);

  const schoolHtml = await schoolResponse.text();
  assert.match(schoolHtml, /International School Bangkok/);
  assert.match(schoolHtml, /Nonthaburi[\s\S]*Thailand/);
  assert.match(schoolHtml, /Provisional school profile/);
  assert.match(schoolHtml, /Evidence capture pending/);
  assert.doesNotMatch(schoolHtml, /application\/ld\+json/);
  assert.match(schoolHtml, /name="robots" content="noindex,\s*follow"/);
});

test("publishes directory hubs and a clear data disclaimer", async () => {
  const [homeResponse, disclaimerResponse] = await Promise.all([
    render("/"),
    render("/disclaimer"),
  ]);
  const homeHtml = await homeResponse.text();
  const disclaimerHtml = await disclaimerResponse.text();

  assert.match(homeHtml, /name="robots" content="index,\s*follow"/);
  assert.match(homeHtml, /official-source-linked profiles/);
  assert.match(disclaimerHtml, /Use the directory as a starting point/);
  assert.match(disclaimerHtml, /Always confirm important details directly with the school/);
});

test("shows evidence progress without indexing a below-gate strict record", async () => {
  const response = await render("/schools/united-nations-international-school-hanoi");
  const html = await response.text();

  assert.match(html, /7\/12/);
  assert.match(html, /Evidence-backed/);
  assert.match(html, /Open conflicts[\s\S]*2/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("renders a strict provisional Ho Chi Minh City profile without indexing it", async () => {
  const response = await render("/schools/european-international-school-ho-chi-minh-city");
  const html = await response.text();

  assert.match(html, /6\/12/);
  assert.match(html, /Evidence-backed/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("does not label a partial composite location as evidence-backed", async () => {
  const response = await render("/schools/apu-american-international-school-ho-chi-minh-city");
  const html = await response.text();

  assert.match(html, /2\/12/);
  assert.match(html, /Ho Chi Minh City, Vietnam[\s\S]*Evidence capture pending/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("renders the completed Ho Chi Minh City provisional collection without indexing thin profiles", async () => {
  const [abcResponse, tasResponse] = await Promise.all([
    render("/schools/abc-international-school-ho-chi-minh-city"),
    render("/schools/the-american-school-ho-chi-minh-city"),
  ]);
  const [abcHtml, tasHtml] = await Promise.all([abcResponse.text(), tasResponse.text()]);

  assert.match(abcHtml, /6\/12/);
  assert.match(abcHtml, /Evidence-backed/);
  assert.match(abcHtml, /name="robots" content="noindex,\s*follow"/);
  assert.match(abcHtml, /application\/ld\+json/);

  assert.match(tasHtml, /5\/12/);
  assert.match(tasHtml, /Evidence-backed/);
  assert.match(tasHtml, /name="robots" content="noindex,\s*follow"/);
  assert.match(tasHtml, /application\/ld\+json/);
});

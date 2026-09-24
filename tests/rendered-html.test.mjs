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

async function checkedLabel(country, slug) {
  const record = JSON.parse(await readFile(
    new URL(`../data/schools/${country}/${slug}.json`, import.meta.url),
    "utf8",
  ));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${record.last_verified}T00:00:00Z`));
}

test("server-renders the global coverage roadmap", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>World School Index/i);
  assert.match(html, /Find the right international school, anywhere\./);
  assert.match(html, /Global coverage roadmap/);
  assert.match(html, /Vietnam, Thailand, and Singapore live\. Southeast Asia next\./);
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
  assert.equal(parsed.recordCount, 36);
  assert.equal(parsed.entities.schools.length, 36);
  assert.equal(parsed.entities.campuses.length, 36);
  assert.equal(parsed.entities.sources.length, 36);
  assert.equal(parsed.entities.verifications.length, 36);
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
  assert.equal(parsed.recordCount, 43);
  assert.equal(parsed.entities.schools.length, 43);
  assert.equal(parsed.entities.campuses.length, 43);
  assert.equal(parsed.entities.sources.length, 43);
  assert.equal(parsed.entities.verifications.length, 43);
});

test("keeps the Vietnam country directory available", async () => {
  const response = await render("/countries/vietnam");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>International Schools in Vietnam/);
  assert.match(html, /36/);
  assert.match(html, /href="\/data\/vietnam-schools\.json"/);
});

test("renders the Thailand country directory and Thailand school records", async () => {
  const [countryResponse, schoolResponse, blockedSchoolResponse, conflictingSchoolResponse] = await Promise.all([
    render("/countries/thailand"),
    render("/schools/international-school-bangkok"),
    render("/schools/singapore-international-school-nonthaburi"),
    render("/schools/new-american-chinese-international-school"),
  ]);
  assert.equal(countryResponse.status, 200);
  assert.equal(schoolResponse.status, 200);
  assert.equal(blockedSchoolResponse.status, 200);
  assert.equal(conflictingSchoolResponse.status, 200);

  const countryHtml = await countryResponse.text();
  assert.match(countryHtml, /<title>International Schools in Thailand/);
  assert.match(countryHtml, /38/);
  assert.match(countryHtml, /href="\/data\/thailand-schools\.json"/);
  assert.match(countryHtml, /Bangkok/);
  assert.match(countryHtml, /Chiang Mai/);
  assert.match(countryHtml, /Phuket/);

  const schoolHtml = await schoolResponse.text();
  assert.match(schoolHtml, /International School Bangkok/);
  assert.match(schoolHtml, /Nonthaburi[\s\S]*Thailand/);
  assert.match(schoolHtml, /School profile/);
  assert.match(schoolHtml, /Official sources checked/);
  assert.doesNotMatch(schoolHtml, /Evidence capture pending/i);
  assert.doesNotMatch(schoolHtml, /application\/ld\+json/);
  assert.match(schoolHtml, /name="robots" content="noindex,\s*follow"/);

  const blockedSchoolHtml = await blockedSchoolResponse.text();
  assert.match(blockedSchoolHtml, /SISB Nonthaburi Campus/);
  assert.doesNotMatch(blockedSchoolHtml, /application\/ld\+json/);
  assert.match(blockedSchoolHtml, /name="robots" content="noindex,\s*follow"/);

  const conflictingSchoolHtml = await conflictingSchoolResponse.text();
  assert.match(conflictingSchoolHtml, /New American Chinese International School/);
  assert.match(conflictingSchoolHtml, /School profile/);
  assert.match(conflictingSchoolHtml, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(conflictingSchoolHtml, /Grades 5–8|Grades 6–8/);
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

test("surfaces the source-backed Hanoi open-day answer on the existing city hub", async () => {
  const response = await render("/cities/hanoi");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /What open day is published for a Hanoi international school\?/);
  assert.match(html, /Open Day \(9 am, 4th August\) - Application Fee Waiver/);
  assert.match(html, /Official open-day notice/);
  assert.match(html, /Checked[\s\S]*Aug 3, 2026/);
  assert.match(html, /href="\/schools\/british-international-school-hanoi"/);
  assert.match(html, /16[\s\S]*official-source-linked profiles/);
  assert.match(html, /Dwight School Hanoi/);
  assert.match(html, /Westlink International School/);
  assert.match(html, /The International School @ ParkCity Hanoi/);
  assert.match(html, /True North International School/);
  assert.match(html, /Reigate Grammar School Vietnam/);
  assert.match(html, /Fairmont International School \(Formerly Hanoi Toronto School\)/);
  assert.match(html, /Singapore International School @ Ciputra/);
  assert.match(html, /Singapore International School @ Van Phuc/);
  assert.match(html, /Singapore International School @ Gamuda Gardens/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
});

test("keeps new Hanoi profiles noindex and out of school schema until the evidence gate is met", async () => {
  const [response, indexedResponse] = await Promise.all([
    render("/schools/dwight-school-hanoi"),
    render("/schools/british-international-school-hanoi"),
  ]);
  const [html, indexedHtml] = await Promise.all([response.text(), indexedResponse.text()]);

  assert.equal(response.status, 200);
  assert.match(html, /Dwight School Hanoi/);
  assert.match(html, /Official sources checked/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(html, /Verified school profile|Verification status|Search indexing|core fields/);
  assert.match(html, /href="https:\/\/dwighthanoi\.org\/"[^>]*>Visit school website/);
  assert.doesNotMatch(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /Evidence review|\b4\/12\b/);
  assert.match(indexedHtml, /application\/ld\+json/);
  assert.match(indexedHtml, /name="robots" content="index,\s*follow"/);
  assert.match(indexedHtml, /Verified school profile/);
  assert.doesNotMatch(indexedHtml, /Verification status|Search indexing|core fields/);
});

test("shows True North's sourced tuition bands without claiming an academic year", async () => {
  const response = await render("/schools/true-north-international-school");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Tuition schedule/);
  assert.match(html, /Foundation Year[\s\S]*300,000,000/);
  assert.match(html, /International Track[\s\S]*650,000,000/);
  assert.match(html, /MOET Track[\s\S]*290,000,000/);
  assert.match(html, /href="https:\/\/truenorth\.edu\.vn\/"[^>]*>Visit school website/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(html, /Verified school profile|2026-2027 tuition/);
});

test("renders the supplied SIS and Fairmont fee schedules with each official source", async () => {
  const [ciputra, gamuda, fairmont] = await Promise.all([
    render("/schools/singapore-international-school-ciputra"),
    render("/schools/singapore-international-school-gamuda-gardens"),
    render("/schools/fairmont-international-school-vietnam"),
  ]);
  const [ciputraHtml, gamudaHtml, fairmontHtml] = await Promise.all([
    ciputra.text(), gamuda.text(), fairmont.text(),
  ]);

  assert.match(ciputraHtml, /498,380,000/);
  assert.match(ciputraHtml, /338,488,000/);
  assert.match(ciputraHtml, /208,593,000/);
  assert.match(ciputraHtml, /International-Programme-Feb-2026-EN\.pdf/);
  assert.match(ciputraHtml, /Integrated-Kindergarten-Programme\.pdf/);
  assert.match(ciputraHtml, /Attendance/);
  assert.match(ciputraHtml, /Yearly Payment Plan/);
  assert.match(gamudaHtml, /267,999,000/);
  assert.match(gamudaHtml, /Half Day with Lunch/);
  assert.match(gamudaHtml, /663,575,000/);
  assert.match(gamudaHtml, /International-Kindergarten-Programme_-10-Feb-2026-EN\.pdf/);
  assert.match(gamudaHtml, /Integrated-Programme_-10-Feb-2026-EN\.pdf/);
  assert.match(fairmontHtml, /2026 - 2027 tuition/);
  assert.match(fairmontHtml, /Yearly Plan/);
  assert.match(fairmontHtml, /225,060,000/);
  assert.match(fairmontHtml, /655,987,500/);
  assert.match(fairmontHtml, /379,933,500/);
  assert.match(fairmontHtml, /fairmontschools\.edu\.vn\/admissions\/tuition-fees/);
  for (const html of [ciputraHtml, gamudaHtml, fairmontHtml]) {
    assert.match(html, /name="robots" content="noindex,\s*follow"/);
  }
});

test("surfaces the source-backed Ho Chi Minh City fee answer on the existing city hub", async () => {
  const response = await render("/cities/ho-chi-minh-city");
  const html = await response.text();
  const checked = await checkedLabel("vietnam", "saigon-south-international-school");

  assert.equal(response.status, 200);
  assert.match(html, /Which listed Ho Chi Minh City school publishes 2026–27 fees\?/);
  assert.match(html, /listed profiles has a verified 2026-2027 tuition schedule/);
  assert.match(html, /530,192,000[\s\S]*EC 3-4[\s\S]*924,546,000[\s\S]*Grade 11-12/);
  assert.match(html, /Official 2026-2027 fee schedule/);
  assert.match(html, new RegExp(`Checked[\\s\\S]*${checked}`));
  assert.match(html, /href="\/schools\/saigon-south-international-school"/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
});

test("ships the first source-checked Singapore collection", async () => {
  const dataExport = await readFile(
    new URL("../public/data/singapore-schools.json", import.meta.url),
    "utf8",
  );
  const parsed = JSON.parse(dataExport);
  assert.equal(parsed.schemaVersion, "2.0");
  assert.equal(parsed.recordCount, 8);
  assert.equal(parsed.entities.schools.length, 8);
  assert.equal(parsed.entities.campuses.length, 8);
  assert.equal(parsed.entities.sources.length, 8);
  assert.equal(parsed.entities.verifications.length, 8);
});

test("renders the Singapore country directory and a provisional Singapore record", async () => {
  const [countryResponse, schoolResponse] = await Promise.all([
    render("/countries/singapore"),
    render("/schools/uwc-south-east-asia"),
  ]);
  assert.equal(countryResponse.status, 200);
  assert.equal(schoolResponse.status, 200);
  const countryHtml = await countryResponse.text();
  const schoolHtml = await schoolResponse.text();
  assert.match(countryHtml, /International Schools in Singapore/);
  assert.match(countryHtml, /8<\/strong><span>school profiles/);
  assert.match(countryHtml, /href="\/data\/singapore-schools\.json"/);
  assert.match(schoolHtml, /UWC South East Asia/);
  assert.match(schoolHtml, /noindex/);
});

test("surfaces the source-backed Bangkok fee answer on the existing city hub", async () => {
  const response = await render("/cities/bangkok");
  const html = await response.text();
  const checked = await checkedLabel("thailand", "bangkok-international-preparatory-secondary-school");

  assert.equal(response.status, 200);
  assert.match(html, /Which listed Bangkok school publishes 2026–27 fees\?/);
  assert.match(html, /listed profiles has a verified 2026–27 annual tuition schedule/);
  assert.match(html, /384,800[\s\S]*Pre-Nursery[\s\S]*771,200[\s\S]*Year 13/);
  assert.match(html, /Official 2026–27 fee schedule/);
  assert.match(html, new RegExp(`Checked[\\s\\S]*${checked}`));
  assert.match(html, /href="\/schools\/bangkok-international-preparatory-secondary-school"/);
  assert.match(html, /listed profiles, not every school in Bangkok/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
});

test("surfaces the source-backed Da Nang programme answer on the existing city hub", async () => {
  const response = await render("/cities/da-nang");
  const html = await response.text();
  const checked = await checkedLabel("vietnam", "sakura-olympia-school-system");

  assert.equal(response.status, 200);
  assert.match(html, /What programme change is published for a listed Da Nang school\?/);
  assert.match(html, /Enhanced Dual-Diploma Preparatory Program/);
  assert.match(html, /Grades 9–10 \(from the 2025–2026 school year\)/);
  assert.match(html, /Official programme pathway/);
  assert.match(html, new RegExp(`Checked[\\s\\S]*${checked}`));
  assert.match(html, /href="\/schools\/sakura-olympia-school-system"/);
  assert.match(html, /listed profiles, not every school in Da Nang/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
});

test("shows evidence-backed facts without exposing internal review progress", async () => {
  const response = await render("/schools/united-nations-international-school-hanoi");
  const html = await response.text();

  assert.match(html, /Official sources checked/);
  assert.match(html, /Evidence-backed/);
  assert.doesNotMatch(html, /Open conflicts|Verification status|Verified school profile/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /Evidence review|\b7\/12\b/);
  assert.match(html, /name="robots" content="index,\s*follow"/);
});

test("renders supplied Hanoi tuition schedules with official PDF links", async () => {
  const cases = [
    ["dwight-school-hanoi", "360,100,000", "dwighthanoi.org"],
    ["westlink-international-school-hanoi", "404,000,000", "westlink.edu.vn"],
    ["reigate-grammar-school-vietnam", "401,625,000", "reigategrammar.edu.vn"],
    ["international-school-parkcity-hanoi", "211,565,750", "isph.edu.vn"],
    ["united-nations-international-school-hanoi", "17,460", "resources.finalsite.net"],
    ["hanoi-international-school", "440,000,000", "hisvietnam.com"],
  ];
  for (const [slug, amount, domain] of cases) {
    const response = await render(`/schools/${slug}`);
    const html = await response.text();
    assert.equal(response.status, 200, slug);
    assert.match(html, /Published school fees/);
    assert.ok(html.includes(amount), `${slug}: amount is shown`);
    assert.ok(html.includes(domain), `${slug}: official PDF is linked`);
  }
  const westlink = await (await render("/schools/westlink-international-school-hanoi")).text();
  assert.match(westlink, /IB PROGRAM/);
  assert.match(westlink, /BILINGUAL PROGRAM/);
});

test("renders a strict provisional Ho Chi Minh City profile without indexing it", async () => {
  const response = await render("/schools/european-international-school-ho-chi-minh-city");
  const html = await response.text();

  assert.match(html, /Official sources checked/);
  assert.match(html, /Evidence-backed/);
  assert.doesNotMatch(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /Evidence review|\b6\/12\b/);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("does not label a partial composite location as evidence-backed", async () => {
  const response = await render("/schools/apu-american-international-school-ho-chi-minh-city");
  const html = await response.text();

  assert.match(html, /Official sources checked/);
  assert.match(html, /Ho Chi Minh City, Vietnam/);
  assert.doesNotMatch(html, /Evidence review|\b2\/12\b/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("keeps pending evidence status private on thin provisional profiles", async () => {
  const response = await render("/schools/sakura-olympia-school-system");
  const html = await response.text();

  assert.match(html, /Not published by the school/);
  assert.doesNotMatch(html, /Evidence capture pending/i);
  assert.match(html, /name="robots" content="noindex,\s*follow"/);
});

test("adds a moderated parent-perspective submission path to every school profile", async () => {
  const response = await render("/schools/sakura-olympia-school-system");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Parent perspectives/);
  assert.match(html, /Parent-submitted, moderated, and not independently verified/);
  assert.match(html, /No parent perspectives have been published yet/);
  assert.match(html, /action="\/api\/parent-perspectives"/);
  assert.match(html, /Email for moderation only/);
  assert.match(html, /never affect completeness scores, indexing, or school schema/);
  assert.doesNotMatch(html, /aggregateRating|Review/);
});

test("renders the completed Ho Chi Minh City provisional collection without indexing thin profiles", async () => {
  const [abcResponse, tasResponse] = await Promise.all([
    render("/schools/abc-international-school-ho-chi-minh-city"),
    render("/schools/the-american-school-ho-chi-minh-city"),
  ]);
  const [abcHtml, tasHtml] = await Promise.all([abcResponse.text(), tasResponse.text()]);

  assert.match(abcHtml, /Official sources checked/);
  assert.match(abcHtml, /Evidence-backed/);
  assert.match(abcHtml, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(abcHtml, /application\/ld\+json/);
  assert.doesNotMatch(abcHtml, /Evidence review|\b6\/12\b/);

  assert.match(tasHtml, /Official sources checked/);
  assert.match(tasHtml, /Evidence-backed/);
  assert.match(tasHtml, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(tasHtml, /application\/ld\+json/);
  assert.doesNotMatch(tasHtml, /Evidence review|\b5\/12\b/);
});

test("renders the Da Nang provisional collection without indexing thin profiles", async () => {
  const [apuResponse, odysseyResponse] = await Promise.all([
    render("/schools/apu-american-international-school-da-nang"),
    render("/schools/odyssey-international-school"),
  ]);
  const [apuHtml, odysseyHtml] = await Promise.all([apuResponse.text(), odysseyResponse.text()]);

  assert.match(apuHtml, /Official sources checked/);
  assert.match(apuHtml, /Evidence-backed/);
  assert.match(apuHtml, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(apuHtml, /Evidence review|\b5\/12\b/);

  assert.match(odysseyHtml, /Official sources checked/);
  assert.match(odysseyHtml, /Evidence-backed/);
  assert.match(odysseyHtml, /name="robots" content="noindex,\s*follow"/);
  assert.doesNotMatch(odysseyHtml, /Evidence review|\b5\/12\b/);
});

import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("publishes the source-checked Hanoi culture and etiquette guide", async () => {
  const response = await render("/guides/vietnam/hanoi/culture-and-etiquette");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Hanoi culture and etiquette for families/);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3001)?\/guides\/vietnam\/hanoi\/culture-and-etiquette\/"/);
  assert.match(html, /What etiquette should a family know before living in Hanoi\?/);
  assert.match(html, /For families comparing schools/);
  assert.match(html, /Sources checked[\s\S]*Aug 4, 2026/);
  assert.match(html, /Viet Nam National Authority of Tourism/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(html, /"@type":"FAQPage"/);
});

test("links the Hanoi city hub back to its living guide", async () => {
  const response = await render("/cities/hanoi");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Hanoi culture and etiquette for families/);
  assert.match(html, /href="\/guides\/vietnam\/hanoi\/culture-and-etiquette\/"/);
});

test("publishes the source-checked Ho Chi Minh City orientation guide", async () => {
  const response = await render("/guides/vietnam/ho-chi-minh-city/living-in-the-city-orientation");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Living in Ho Chi Minh City with children/);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3001)?\/guides\/vietnam\/ho-chi-minh-city\/living-in-the-city-orientation\/"/);
  assert.match(html, /What should a family know before living in Ho Chi Minh City\?/);
  assert.match(html, /For families comparing schools/);
  assert.match(html, /Sources checked[\s\S]*Aug 10, 2026/);
  assert.match(html, /Ho Chi Minh City Tourism Promotion Center/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"mainEntityOfPage":"https:\/\/worldschoolindex\.com\/guides\/vietnam\/ho-chi-minh-city\/living-in-the-city-orientation\/"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(html, /"@type":"FAQPage"/);
});

test("links the Ho Chi Minh City hub back to its orientation guide", async () => {
  const response = await render("/cities/ho-chi-minh-city");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Living in Ho Chi Minh City with children/);
  assert.match(html, /href="\/guides\/vietnam\/ho-chi-minh-city\/living-in-the-city-orientation\/"/);
});

test("publishes the source-checked Da Nang orientation guide", async () => {
  const response = await render("/guides/vietnam/da-nang/living-in-the-city-orientation");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<title>Living in Da Nang with children/);
  assert.match(html, /rel="canonical" href="http:\/\/localhost(?::3001)?\/guides\/vietnam\/da-nang\/living-in-the-city-orientation\/"/);
  assert.match(html, /What should a family know before living in Da Nang\?/);
  assert.match(html, /For families comparing schools/);
  assert.match(html, /Sources checked[\s\S]*Aug 16, 2026/);
  assert.match(html, /Da Nang Tourism Promotion Center/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /"mainEntityOfPage":"https:\/\/worldschoolindex\.com\/guides\/vietnam\/da-nang\/living-in-the-city-orientation\/"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.doesNotMatch(html, /"@type":"FAQPage"/);
});

test("links the Da Nang city hub back to its orientation guide", async () => {
  const response = await render("/cities/da-nang");
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Living in Da Nang with children/);
  assert.match(html, /href="\/guides\/vietnam\/da-nang\/living-in-the-city-orientation\/"/);
});

test("includes the guide in the sitemap without exposing below-gate schools", async () => {
  const response = await render("/sitemap.xml");
  const xml = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /xml/i);
  assert.match(xml, /guides\/vietnam\/hanoi\/culture-and-etiquette\//);
  assert.match(xml, /guides\/vietnam\/ho-chi-minh-city\/living-in-the-city-orientation\//);
  assert.match(xml, /guides\/vietnam\/da-nang\/living-in-the-city-orientation\//);
  assert.match(xml, /https:\/\/worldschoolindex\.com\/guides\/vietnam\/ho-chi-minh-city\/living-in-the-city-orientation\//);
  assert.match(xml, /https:\/\/worldschoolindex\.com\/guides\/vietnam\/da-nang\/living-in-the-city-orientation\//);
  assert.doesNotMatch(xml, /schools\/united-nations-international-school-hanoi/);
});

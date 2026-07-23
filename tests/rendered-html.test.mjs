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
  assert.match(html, /Vietnam first\. Southeast Asia next\./);
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
  assert.match(layout, /World School Index/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|themeColor|\bViewport\b/);

  await assert.rejects(access(new URL("../app/_sites-preview/", import.meta.url)));
  await assert.rejects(access(new URL("public/_sites-preview", templateRoot)));
});

test("keeps the Vietnam country directory available", async () => {
  const response = await render("/countries/vietnam");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /International schools in Vietnam/);
  assert.match(html, /22/);
  assert.match(html, /Download Vietnam data/);
});

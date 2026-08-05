import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCityGuideData, validateCityGuideRecord } from "../scripts/lib/city-guide.ts";
import {
  assertValidSchoolRecord,
  createEmptySchoolRecord,
  finalizeDerivedFields,
  validateSchoolRecord,
} from "../scripts/lib/school-record.ts";
import { htmlToVisibleText } from "../scripts/extract.ts";
import { parseRobots } from "../scripts/fetch.ts";

function recordWithName() {
  const record = createEmptySchoolRecord("vn-hanoi-example-school", "unverified");
  record.name = "Example School";
  record.provenance.name = {
    source_url: "https://example.edu/about",
    retrieved_date: "2026-07-23",
    evidence: "Example School",
    method: "published",
    conflict: false,
    candidates: [],
  };
  return finalizeDerivedFields(record);
}

test("accepts a structurally strict, provenance-complete noindex record", async () => {
  const record = recordWithName();
  await assert.doesNotReject(assertValidSchoolRecord(record));
  assert.equal(record.completeness_score, 1);
  assert.equal(record.indexable, false);
});

test("rejects populated fields without field-level provenance", async () => {
  const record = recordWithName();
  const location = record.location;
  if (!location || typeof location !== "object") throw new Error("missing location");
  location.city = "Hanoi";
  finalizeDerivedFields(record);
  const errors = await validateSchoolRecord(record);
  assert.ok(errors.some((error) => error.includes("location.city: populated field is missing provenance")));
});

test("rejects an indexable flag below the completeness threshold", async () => {
  const record = recordWithName();
  record.indexable = true;
  const errors = await validateSchoolRecord(record);
  assert.ok(errors.some((error) => error.includes("indexable: expected false")));
});

test("rejects unknown properties through the JSON Schema", async () => {
  const record = recordWithName();
  record.unreviewed_note = "not allowed";
  const errors = await validateSchoolRecord(record);
  assert.ok(errors.some((error) => error.includes("must NOT have additional properties")));
});

test("accepts unresolved source conflicts only when the data field stays null", async () => {
  const record = recordWithName();
  record.provenance["enrolment.total"] = {
    source_url: "https://example.edu/profile",
    retrieved_date: "2026-07-23",
    evidence: "School community 1162 students",
    method: "conflict",
    conflict: true,
    candidates: [
      {
        value: "1162",
        source_url: "https://example.edu/profile",
        retrieved_date: "2026-07-23",
        evidence: "School community 1162 students",
      },
      {
        value: "over 1100",
        source_url: "https://example.edu/about",
        retrieved_date: "2026-07-23",
        evidence: "Serving over 1100 students",
      },
    ],
  };
  finalizeDerivedFields(record);
  await assert.doesNotReject(assertValidSchoolRecord(record));

  record.enrolment.total = "1162";
  finalizeDerivedFields(record);
  const errors = await validateSchoolRecord(record);
  assert.ok(errors.some((error) => error.includes("conflicting values must leave the field null")));
});

test("turns cached HTML into normalized visible evidence text", () => {
  const text = htmlToVisibleText("<main><p>World &amp; School&nbsp;Index</p><script>hidden()</script></main>");
  assert.equal(text, "World & School Index");
});

test("obeys the longest matching robots.txt rule and crawl delay", () => {
  const robots = [
    "User-agent: *",
    "Disallow: /private/",
    "Allow: /private/public/",
    "Crawl-delay: 5",
  ].join("\n");
  assert.deepEqual(parseRobots(robots, "/private/report"), { permitted: false, crawlDelayMs: 5_000 });
  assert.deepEqual(parseRobots(robots, "/private/public/report"), { permitted: true, crawlDelayMs: 5_000 });
});

test("keeps the Hanoi worked example below the index gate when official sources conflict", async () => {
  const record = JSON.parse(await readFile(
    new URL("../data/schools/vietnam/united-nations-international-school-hanoi.json", import.meta.url),
    "utf8",
  ));
  assert.equal(record.completeness_score, 7);
  assert.equal(record.indexable, false);
  assert.equal(record.enrolment.total, null);
  assert.equal(record.provenance["enrolment.total"].method, "conflict");
  assert.equal(record.provenance["enrolment.total"].candidates.length, 2);
  assert.equal(record.provenance["enrolment.nationalities_count"].candidates.length, 3);
});

test("validates the city-guide ledger, citations, and evidence limits", async () => {
  const result = await validateCityGuideData();
  assert.deepEqual(result, { guideCount: 1, sourceCount: 5 });
});

test("rejects missing guide citations and evidence over 25 words", async () => {
  const guides = JSON.parse(await readFile(
    new URL("../data/city-guides.json", import.meta.url),
    "utf8",
  ));
  const guide = structuredClone(guides[0]);
  guide.direct_answer.source_ids.push("missing-source");
  guide.sources[0].evidence[0] = Array.from({ length: 26 }, (_, index) => `word${index}`).join(" ");
  const errors = await validateCityGuideRecord(guide);
  assert.ok(errors.some((error) => error.includes("missing-source")));
  assert.ok(errors.some((error) => error.includes("maximum is 25")));
});

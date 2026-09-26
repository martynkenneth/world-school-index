import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyGapAction,
  highestImpactField,
  rankGapSchools,
  renderGapReport,
  sixMonthRetryDate,
} from "../scripts/gap-report.ts";

function record(overrides = {}) {
  return {
    contact: { website: "https://school.example/", admissions_url: null, email: null },
    provenance: {},
    ...overrides,
  };
}

test("gap actions are based on crawl evidence and carry required details", () => {
  const reportDate = "2026-09-26";
  const emailAction = classifyGapAction(
    "fees.by_year_group",
    record({ contact: { website: "https://school.example/", admissions_url: null, email: "admissions@school.example" } }),
    {
      requests: [{ requested_url: "https://school.example/fees", status: "blocked", error: "disallowed by robots.txt" }],
      discoveredUrls: [],
      jsShellUrls: [],
    },
    reportDate,
  );
  assert.deepEqual(emailAction, { tag: "EMAIL", detail: "blocker: `disallowed by robots.txt`" });

  const jsAction = classifyGapAction(
    "curricula",
    record(),
    {
      requests: [{ requested_url: "https://school.example/curriculum", final_url: "https://school.example/curriculum", status: "fetched" }],
      discoveredUrls: ["https://school.example/curriculum"],
      jsShellUrls: ["https://school.example/curriculum"],
    },
    reportDate,
  );
  assert.equal(jsAction.tag, "JS");
  assert.match(jsAction.detail, /headless-browser note: render/);

  const unpublishedAction = classifyGapAction(
    "accreditations",
    record(),
    {
      requests: [
        { requested_url: "https://school.example/", status: "fetched", retrieved_date: "2026-03-01" },
        { requested_url: "https://school.example/", status: "fetched", retrieved_date: "2026-09-01" },
      ],
      discoveredUrls: [],
      jsShellUrls: [],
    },
    reportDate,
  );
  assert.equal(unpublishedAction.tag, "UNPUBLISHED");
  assert.match(unpublishedAction.detail, /retry: 2027-03-26/);

  const searchAction = classifyGapAction(
    "fees.by_year_group",
    record(),
    {
      requests: [{ requested_url: "https://school.example/", status: "fetched", retrieved_date: "2026-09-01" }],
      discoveredUrls: ["https://school.example/admissions/tuition-fees"],
      jsShellUrls: [],
    },
    reportDate,
  );
  assert.equal(searchAction.tag, "SEARCH");
  assert.match(searchAction.detail, /https:\/\/school\.example\/admissions\/tuition-fees/);

  const filteredAction = classifyGapAction(
    "age_range",
    record(),
    {
      requests: [{ requested_url: "https://school.example/", status: "fetched" }],
      discoveredUrls: ["https://cdnjs.cloudflare.com/theme.css", "https://school.example/admissions/ages"],
      jsShellUrls: [],
    },
    reportDate,
  );
  assert.equal(filteredAction.tag, "SEARCH");
  assert.match(filteredAction.detail, /school\.example\/admissions\/ages/);
  assert.doesNotMatch(filteredAction.detail, /cloudflare/);
});

test("six-month retry dates clamp to the last valid day", () => {
  assert.equal(sixMonthRetryDate("2026-09-26"), "2027-03-26");
  assert.equal(sixMonthRetryDate("2024-08-31"), "2025-02-28");
});

test("ranking and report totals follow the index-threshold gap", () => {
  const oneAway = {
    name: "One Away",
    city: "Hanoi",
    score: 7,
    missing: [{ field: "fees.by_year_group", action: { tag: "SEARCH", detail: "candidate URLs: <https://one.example/fees>" } }],
    admissionsUrl: "https://one.example/admissions",
    admissionsEmail: "admissions@one.example",
    highestImpactNextField: "fees.by_year_group",
  };
  const twoAway = {
    name: "Two Away",
    city: "Bangkok",
    score: 6,
    missing: [
      { field: "curricula", action: { tag: "JS", detail: "headless-browser note: render <https://two.example/>" } },
      { field: "accreditations", action: { tag: "UNPUBLISHED", detail: "retry: 2027-03-26" } },
    ],
    admissionsUrl: null,
    admissionsEmail: null,
    highestImpactNextField: "curricula",
  };
  assert.deepEqual(rankGapSchools([twoAway, oneAway]).map((school) => school.name), ["One Away", "Two Away"]);
  assert.equal(highestImpactField(["curricula", "fees.by_year_group"]), "fees.by_year_group");

  const report = renderGapReport([twoAway, oneAway], "2026-09-26", 3, 1);
  assert.ok(report.indexOf("## 1. One Away") < report.indexOf("## 2. Two Away"));
  assert.match(report, /Schools one field from threshold: 1/);
  assert.match(report, /Schools two fields from threshold: 1/);
  assert.match(report, /SEARCH: 1/);
  assert.match(report, /JS: 1/);
  assert.match(report, /UNPUBLISHED: 1/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { validateParentPerspectiveInput } from "../lib/parent-perspectives.ts";

const validInput = {
  schoolSlug: "sakura-olympia-school-system",
  relationship: "Current parent",
  yearGroup: "Year 5",
  attendancePeriod: "2024–2026",
  topics: ["Admissions", "Communication"],
  comment: "The admissions team explained the document sequence clearly, and the weekly communication helped our family plan transport and school events in advance.",
  parentEmail: "Parent@example.com",
  consentToPublish: true,
  website: "",
};

test("accepts a structured parent perspective and normalizes the private email", () => {
  const result = validateParentPerspectiveInput(validInput);
  assert.equal(result.ok, true);
  assert.equal(result.value.parentEmail, "parent@example.com");
  assert.deepEqual(result.value.topics, ["Admissions", "Communication"]);
});

test("rejects comments that are too short to be useful", () => {
  const result = validateParentPerspectiveInput({ ...validInput, comment: "It was good." });
  assert.equal(result.ok, false);
  assert.match(result.error, /80 and 1,200/);
});

test("rejects unsupported topics and excessive topic selection", () => {
  const result = validateParentPerspectiveInput({
    ...validInput,
    topics: ["Admissions", "Communication", "Transport", "Best school"],
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /one and three/);
});

test("silently recognizes honeypot submissions", () => {
  const result = validateParentPerspectiveInput({ ...validInput, website: "https://spam.example" });
  assert.equal(result.ok, false);
  assert.equal(result.isHoneypot, true);
});

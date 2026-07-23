import fs from "node:fs/promises";
import path from "node:path";
import { schools } from "../data/schools.ts";
import { countryCoverage } from "../data/coverage.ts";
import { normalizeSchoolRecords } from "../data/model.ts";
import { globalSourceRegistry } from "../data/source-registry.ts";

const normalized = normalizeSchoolRecords(schools);
const vietnamCoverage = countryCoverage.find((country) => country.code === "VN");

const outputDirectory = path.resolve("public", "data");
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(
  path.join(outputDirectory, "vietnam-schools.json"),
  `${JSON.stringify({
    schemaVersion: "2.0",
    generatedOn: new Date().toISOString().slice(0, 10),
    country: "Vietnam",
    recordCount: schools.length,
    coverage: vietnamCoverage,
    entities: normalized,
    records: schools,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Exported ${schools.length} Vietnam school records.`);

await fs.writeFile(
  path.join(outputDirectory, "global-coverage-plan.json"),
  `${JSON.stringify({
    schemaVersion: "1.0",
    generatedOn: new Date().toISOString().slice(0, 10),
    countries: countryCoverage,
    sourceRegistry: globalSourceRegistry,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Exported ${countryCoverage.length} country coverage stages and ${globalSourceRegistry.length} discovery sources.`);

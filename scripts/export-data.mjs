import fs from "node:fs/promises";
import path from "node:path";
import { countries, schools } from "../data/schools.ts";
import { countryCoverage } from "../data/coverage.ts";
import { normalizeSchoolRecords } from "../data/model.ts";
import { globalSourceRegistry } from "../data/source-registry.ts";

const outputDirectory = path.resolve("public", "data");
await fs.mkdir(outputDirectory, { recursive: true });

function publishableRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== "summary"));
}

for (const country of countries) {
  const records = schools.filter((school) => school.countryCode === country.code);
  const coverage = countryCoverage.find((item) => item.code === country.code);
  await fs.writeFile(
    path.join(outputDirectory, `${country.slug}-schools.json`),
    `${JSON.stringify({
      schemaVersion: "2.0",
      generatedOn: new Date().toISOString().slice(0, 10),
      country: country.name,
      recordCount: records.length,
      coverage,
      entities: normalizeSchoolRecords(records),
      records: records.map(publishableRecord),
    }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Exported ${records.length} ${country.name} school records.`);
}

await fs.writeFile(
  path.join(outputDirectory, "all-schools.json"),
  `${JSON.stringify({
    schemaVersion: "2.0",
    generatedOn: new Date().toISOString().slice(0, 10),
    recordCount: schools.length,
    entities: normalizeSchoolRecords(schools),
    records: schools.map(publishableRecord),
  }, null, 2)}\n`,
  "utf8",
);

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

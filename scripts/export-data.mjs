import fs from "node:fs/promises";
import path from "node:path";
import { schools } from "../data/schools.ts";

const outputDirectory = path.resolve("public", "data");
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(
  path.join(outputDirectory, "vietnam-schools.json"),
  `${JSON.stringify({
    generatedOn: new Date().toISOString().slice(0, 10),
    country: "Vietnam",
    recordCount: schools.length,
    records: schools,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Exported ${schools.length} Vietnam school records.`);

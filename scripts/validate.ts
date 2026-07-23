import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { validateSchoolRecord, type SchoolRecord } from "./lib/school-record.ts";

async function jsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".json") ? [absolute] : [];
  }));
  return nested.flat().sort();
}

export async function validateDirectory(directory = path.resolve("data", "schools")): Promise<void> {
  let files: string[];
  try {
    files = await jsonFiles(directory);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error("No data/schools directory exists; the build cannot publish without validated records");
    throw error;
  }
  if (files.length === 0) throw new Error("No school JSON records were found under data/schools");

  const failures: string[] = [];
  let indexableCount = 0;
  for (const file of files) {
    let record: SchoolRecord;
    try {
      record = JSON.parse(await readFile(file, "utf8")) as SchoolRecord;
    } catch (error) {
      failures.push(`${path.relative(process.cwd(), file)}: invalid JSON (${(error as Error).message})`);
      continue;
    }
    const errors = await validateSchoolRecord(record);
    if (errors.length > 0) {
      failures.push(`${path.relative(process.cwd(), file)}:\n  - ${errors.join("\n  - ")}`);
    } else if (record.indexable) {
      indexableCount += 1;
    }
  }

  if (failures.length > 0) {
    throw new Error(`Data validation failed:\n${failures.join("\n")}`);
  }
  console.log(`Validated ${files.length} school record(s); ${indexableCount} passed the index gate.`);
}

if (process.argv.includes("--run")) {
  validateDirectory().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dbRun, closeDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema.sql");

async function initDb() {
  const schema = await fs.readFile(schemaPath, "utf8");
  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await dbRun(statement);
  }
}

initDb()
  .then(async () => {
    await closeDb();
    console.log("Database initialized");
  })
  .catch(async (error) => {
    console.error(error);
    await closeDb();
    process.exit(1);
  });

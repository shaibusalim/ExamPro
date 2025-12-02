import { sql } from "../lib/db";
import fs from "fs";
import path from "path";
async function runMigrations() {
  console.log("Running database migrations...");

  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable not set.");
    process.exit(1);
  }

  const migrationFiles = [
    "01-schema.sql",
    "02-seed-data.sql",
    "03-initialize-users.sql",
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    console.log(`Executing migration: ${file}`);
    try {
      const sqlContent = fs.readFileSync(filePath, "utf8");
      const commands = sqlContent
        .split(";")
        .map((cmd) => cmd.trim())
        .filter((cmd) => cmd.length > 0);

      for (const command of commands) {
        if (command) {
          await sql.query(command);
        }
      }
      console.log(`Successfully executed ${file}`);
    } catch (error) {
      console.error(`Error executing ${file}:`, error);
      process.exit(1);
    }
  }

  console.log("All migrations completed successfully!");
  process.exit(0);
}

runMigrations();

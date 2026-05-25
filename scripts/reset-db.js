import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateStudent } from "../server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "server", "data");
const DATA_FILE = path.join(DATA_DIR, "students.json");

console.log("Resetting database...");

try {
  // Clear any existing students.json
  if (fs.existsSync(DATA_FILE)) {
    fs.unlinkSync(DATA_FILE);
    console.log("Removed old database file.");
  }

  // Regenerate seed data
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const freshStudents = Array.from({ length: 40 }, (_, i) => generateStudent(i, 42));
  fs.writeFileSync(DATA_FILE, JSON.stringify(freshStudents, null, 2), "utf8");

  console.log("Database reset complete! Seeded 40 default students.");
  process.exit(0);
} catch (err) {
  console.error("Failed to reset database:", err);
  process.exit(1);
}

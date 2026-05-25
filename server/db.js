import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── CONFIGURATION & PATH RESOLUTION ─────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "students.json");

/**
 * Seeded pseudo-random number generator.
 * Provides deterministic behavior based on a given seed.
 * @param {number} seed - The seed value to initialize the sequence.
 * @returns {function} A function that returns a value between 0 and 1.
 */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateStudent(id, seed) {
  const rng = seededRandom(seed + id * 1337);
  const riskLevel = rng() < 0.15 ? "high" : rng() < 0.35 ? "medium" : "low";
  const isHighRisk = riskLevel === "high";
  const isMedRisk = riskLevel === "medium";

  const names = ["Alex Chen","Jordan Park","Sam Rivera","Taylor Kim","Morgan Lee",
    "Casey Liu","Riley Wang","Drew Patel","Avery Singh","Quinn Zhao","Blake Torres",
    "Sage Nguyen","Reese Yamamoto","Cameron Okafor","Dakota Ivanov","Skylar Mehta",
    "Hayden Costa","Peyton Andersson","Rowan Ferreira","Finley Nakamura"];
  const majors = ["Computer Science","Psychology","Biology","Engineering","Business",
    "Mathematics","Sociology","Chemistry","Economics","Philosophy"];
  const name = names[id % names.length];
  const major = majors[id % majors.length];
  const year = Math.floor(rng() * 4) + 1;

  // Generate 16 weeks of data
  const weeks = Array.from({ length: 16 }, (_, w) => {
    const weekRng = seededRandom(seed + id * 999 + w * 77);
    const gradualDecline = isHighRisk ? (w > 4 ? (w - 4) * 0.03 : 0) : 0;

    return {
      week: w + 1,
      grade: Math.max(20, Math.min(100, 78 + (isHighRisk ? -15 : isMedRisk ? -5 : 5) * (w / 16) + (weekRng() - 0.5) * 18 - gradualDecline * 15)),
      attendance: Math.max(0, Math.min(1, 0.92 - (isHighRisk ? 0.35 : isMedRisk ? 0.12 : 0) * (w / 16) + (weekRng() - 0.5) * 0.1)),
      lateSubmissions: Math.min(1, (isHighRisk ? 0.4 : isMedRisk ? 0.15 : 0.05) + gradualDecline * 0.5 + weekRng() * 0.15),
      forumPosts: Math.max(0, Math.round((isHighRisk ? 1 : isMedRisk ? 3 : 6) - gradualDecline * 3 + (weekRng() - 0.3) * 3)),
      offHoursActivity: Math.min(1, (isHighRisk ? 0.45 : isMedRisk ? 0.2 : 0.08) + gradualDecline * 0.3 + weekRng() * 0.12),
      sleepScore: Math.max(1, Math.min(10, (isHighRisk ? 4 : isMedRisk ? 6 : 8) + (weekRng() - 0.5) * 2 - gradualDecline * 2)),
      stressScore: Math.min(10, (isHighRisk ? 7.5 : isMedRisk ? 5 : 2.5) + gradualDecline * 2 + (weekRng() - 0.5) * 2),
    };
  });

  // Compute risk score from features
  const latest = weeks[weeks.length - 1];
  const prev = weeks[Math.max(0, weeks.length - 4)];
  const gradeTrend = (latest.grade - prev.grade) / 4;
  const attendDrop = prev.attendance - latest.attendance;
  const lateRatio = latest.lateSubmissions;
  const engagementDrop = (prev.forumPosts - latest.forumPosts) / Math.max(1, prev.forumPosts);
  const offHours = latest.offHoursActivity;

  const rawScore = (
    lateRatio * 0.25 +
    Math.max(0, -gradeTrend / 5) * 0.25 +
    attendDrop * 0.2 +
    Math.max(0, engagementDrop) * 0.15 +
    offHours * 0.15
  );
  const riskScore = Math.min(10, Math.max(0.5, rawScore * 12 + (rng() - 0.5)));

  // SHAP-like feature contributions
  const factors = [
    { factor: "Late Submissions", impact: lateRatio * 0.25 * 12, description: `${Math.round(lateRatio * 100)}% late rate` },
    { factor: "Grade Trend", impact: Math.max(0, -gradeTrend / 5) * 0.25 * 12, description: `${gradeTrend > 0 ? "+" : ""}${gradeTrend.toFixed(1)} pts/wk` },
    { factor: "Attendance Drop", impact: attendDrop * 0.2 * 12, description: `${Math.round(attendDrop * 100)}% decrease` },
    { factor: "Forum Activity", impact: Math.max(0, engagementDrop) * 0.15 * 12, description: `${latest.forumPosts} posts/wk` },
    { factor: "Off-Hours Activity", impact: offHours * 0.15 * 12, description: `${Math.round(offHours * 100)}% late logins` },
  ].sort((a, b) => b.impact - a.impact);

  return {
    id, name, major, year,
    hash: `STU${String(id).padStart(4, "0")}`,
    riskScore: parseFloat(riskScore.toFixed(2)),
    riskLevel: riskScore > 6.5 ? "high" : riskScore > 3.5 ? "medium" : "low",
    weeks, factors, latest,
    interventionOffered: isHighRisk && rng() > 0.4,
    interventionAccepted: isHighRisk && rng() > 0.6,
    email: `${name.split(" ")[0].toLowerCase()}@university.edu`,
  };
}

// ─── DATABASE INITIALIZATION ────────────────────────────────────────────────
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialStudents = Array.from({ length: 40 }, (_, i) => generateStudent(i, 42));
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialStudents, null, 2), "utf8");
    console.log("Database initialized with 40 seed students.");
  }
}

initDb();

// ─── DATABASE ACTIONS ────────────────────────────────────────────────────────
export function getStudents() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

export function saveStudents(students) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing database:", err);
    return false;
  }
}

export function getStudentById(id) {
  const students = getStudents();
  return students.find((s) => s.id === Number(id));
}

export function addOrUpdateStudent(student) {
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === student.id);
  if (idx !== -1) {
    students[idx] = student;
  } else {
    students.push(student);
  }
  saveStudents(students);
  return student;
}

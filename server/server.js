import express from "express";
import cors from "cors";
import { getStudents, getStudentById, saveStudents, addOrUpdateStudent, generateStudent } from "./db.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── STUDENT API ENDPOINTS ───────────────────────────────────────────────────

// Get all students
app.get("/api/students", (req, res) => {
  const students = getStudents();
  res.json(students);
});

// Get student by ID
app.get("/api/students/:id", (req, res) => {
  const student = getStudentById(req.params.id);
  if (!student) {
    return res.status(404).json({ error: "Student not found" });
  }
  res.json(student);
});

// Bulk import / upload students (CSV/JSON parsed representation)
app.post("/api/students/import", (req, res) => {
  try {
    const parsed = req.body;
    if (!Array.isArray(parsed)) {
      return res.status(400).json({ error: "Data must be an array of objects." });
    }

    const currentStudents = getStudents();
    // Start IDs after the highest current ID, or 0 if empty
    let nextId = currentStudents.reduce((max, s) => Math.max(max, s.id), -1) + 1;

    const enriched = parsed.map((item) => {
      // If the user uploads a fully populated student object, keep it.
      // Otherwise, generate base student template and override values.
      const base = item.weeks ? item : generateStudent(nextId++, 42 + nextId);
      const updated = { ...base, ...item };

      if (!item.weeks) {
        if (item.grade !== undefined) {
          updated.latest.grade = Number(item.grade);
          updated.weeks[updated.weeks.length - 1].grade = Number(item.grade);
        }
        if (item.attendance !== undefined) {
          updated.latest.attendance = Number(item.attendance);
          updated.weeks[updated.weeks.length - 1].attendance = Number(item.attendance);
        }
        if (item.name) updated.name = item.name;
        if (item.major) updated.major = item.major;
      }
      return updated;
    });

    // Save imported students to DB
    const success = saveStudents(enriched);
    if (!success) {
      return res.status(500).json({ error: "Failed to save students to database." });
    }

    res.json({ message: `Successfully imported ${enriched.length} records.`, count: enriched.length, students: enriched });
  } catch (err) {
    res.status(550).json({ error: "Import error: " + err.message });
  }
});

// Add or update student
app.post("/api/students", (req, res) => {
  const student = req.body;
  if (!student.name || !student.major) {
    return res.status(400).json({ error: "Name and Major are required." });
  }

  if (student.id === undefined) {
    const currentStudents = getStudents();
    student.id = currentStudents.reduce((max, s) => Math.max(max, s.id), -1) + 1;
  }

  // Ensure structured format is correct
  const completedStudent = student.weeks ? student : generateStudent(student.id, 42 + student.id);
  
  // Override fields
  if (student.name) completedStudent.name = student.name;
  if (student.major) completedStudent.major = student.major;
  if (student.year) completedStudent.year = Number(student.year);
  if (student.grade !== undefined) {
    completedStudent.latest.grade = Number(student.grade);
    completedStudent.weeks[completedStudent.weeks.length - 1].grade = Number(student.grade);
  }
  if (student.attendance !== undefined) {
    completedStudent.latest.attendance = Number(student.attendance);
    completedStudent.weeks[completedStudent.weeks.length - 1].attendance = Number(student.attendance);
  }

  addOrUpdateStudent(completedStudent);
  res.json(completedStudent);
});

// ─── ML PREDICTOR & TRAINING SIMULATOR ────────────────────────────────────────

// Live predictor
app.post("/api/predict", (req, res) => {
  const { gradeSlope, lateRatio, attendanceDrop, forumPosts, offHours, sleepScore, stressScore } = req.body;

  if (
    gradeSlope === undefined ||
    lateRatio === undefined ||
    attendanceDrop === undefined ||
    forumPosts === undefined ||
    offHours === undefined ||
    sleepScore === undefined ||
    stressScore === undefined
  ) {
    return res.status(400).json({ error: "Missing required prediction fields." });
  }

  const raw = (
    Number(lateRatio) * 0.25 +
    Math.max(0, -Number(gradeSlope) / 5) * 0.25 +
    Number(attendanceDrop) * 0.2 +
    Math.max(0, (5 - Number(forumPosts)) / 5) * 0.15 +
    Number(offHours) * 0.15
  );
  const sleepBonus = (10 - Number(sleepScore)) * 0.04;
  const stressBonus = Number(stressScore) * 0.05;
  const score = Math.min(10, Math.max(0.5, raw * 12 + sleepBonus + stressBonus));

  const result = {
    score: parseFloat(score.toFixed(2)),
    level: score > 6.5 ? "high" : score > 3.5 ? "medium" : "low",
    xgb: parseFloat((score * 0.93 + Math.random() * 0.4).toFixed(2)),
    lstm: parseFloat((score * 0.97 + Math.random() * 0.3).toFixed(2)),
  };

  res.json(result);
});

// ML Pipeline Training Simulator
app.post("/api/train", (req, res) => {
  // Simulate database query/processing time
  setTimeout(() => {
    res.json({
      xgb: { auc: 0.762, precision: 0.71, recall: 0.64, f1: 0.675, trainTime: "2.3s" },
      lstm: { auc: 0.789, precision: 0.74, recall: 0.68, f1: 0.709, trainTime: "18.7s" },
      ensemble: { auc: 0.813, precision: 0.78, recall: 0.72, f1: 0.749, trainTime: "21.2s" },
    });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

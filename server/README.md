# MindTrack EWS Backend API Documentation

The MindTrack Early Warning System backend is built with Node.js and Express. It persists student data locally using a file-based JSON database and handles risk score prediction and ML simulation logic.

## Getting Started

To run the backend server separately:

```bash
npm run server
```

It runs on port `5000` by default.

## API Endpoints

### 1. Student Management

#### `GET /api/students`
Returns an array of all students.

#### `GET /api/students/:id`
Returns details of a single student by their numeric ID.

#### `POST /api/students`
Creates or updates a student record. Overrides the student's properties and updates latest grade/attendance weekly details.
- Request Body format:
  ```json
  {
    "name": "Alex Chen",
    "major": "Computer Science",
    "year": 3,
    "grade": 88,
    "attendance": 0.94
  }
  ```

#### `POST /api/students/import`
Accepts a JSON array of students for bulk import and seeds/enriches them with the ML-mimicking engine before persisting to the database.

---

### 2. Machine Learning & Predictors

#### `POST /api/predict`
Runs a real-time risk score calculation based on current academic and behavioral metrics.
- Request Body format:
  ```json
  {
    "gradeSlope": -2.5,
    "lateRatio": 0.2,
    "attendanceDrop": 0.1,
    "forumPosts": 3,
    "offHours": 0.15,
    "sleepScore": 6.5,
    "stressScore": 5.0
  }
  ```
- Returns:
  ```json
  {
    "score": 4.12,
    "level": "medium",
    "xgb": 3.92,
    "lstm": 4.18
  }
  ```

#### `POST /api/train`
Triggers a training simulation and returns evaluation performance metric results for XGBoost, LSTM, and the Ensemble model.

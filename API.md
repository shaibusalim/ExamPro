# ExamPro API Documentation

## Base URL
\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication
All protected endpoints require JWT token in Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

---

## Authentication Endpoints

### Register
\`\`\`
POST /auth/register
\`\`\`

Create a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "role": "teacher|student",
  "classLevel": "B7|B8",  // required if role is student
  "studentId": "B7001"     // optional
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "teacher"
  }
}
\`\`\`

### Login
\`\`\`
POST /auth/login
\`\`\`

Authenticate and receive JWT token.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "teacher",
    "classLevel": "B7"
  }
}
\`\`\`

---

## Classes Endpoints

### Get Classes
\`\`\`
GET /classes
Authorization: Bearer <token>
\`\`\`

Get all classes created by the authenticated teacher.

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "name": "B7 - Section A",
    "level": "B7",
    "student_count": 30,
    "description": "Basic 7 Computing"
  }
]
\`\`\`

### Create Class
\`\`\`
POST /classes
Authorization: Bearer <token>
\`\`\`

Create a new class.

**Request Body:**
\`\`\`json
{
  "name": "B7 - Section A",
  "level": "B7",
  "description": "Basic 7 Computing Class"
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "id": "uuid",
  "name": "B7 - Section A",
  "level": "B7",
  "teacher_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
\`\`\`

---

## Exams Endpoints

### Get Exams
\`\`\`
GET /exams
Authorization: Bearer <token>
\`\`\`

Get all exams (teacher: their exams, student: available exams).

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "title": "Mid-Term Examination",
    "class_name": "B7 - Section A",
    "status": "published",
    "duration_minutes": 60,
    "total_marks": 100,
    "total_attempts": 5
  }
]
\`\`\`

### Create Exam
\`\`\`
POST /exams
Authorization: Bearer <token>
\`\`\`

Create a new exam.

**Request Body:**
\`\`\`json
{
  "classId": "uuid",
  "title": "Mid-Term Examination",
  "description": "Comprehensive exam covering all topics",
  "durationMinutes": 60,
  "totalMarks": 100,
  "passingMarks": 50,
  "questions": [
    {
      "id": "question_id",
      "marks": 2
    }
  ]
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "id": "uuid",
  "message": "Exam created successfully"
}
\`\`\`

---

## Student Exam Endpoints

### Get Student Exams
\`\`\`
GET /student/exams
Authorization: Bearer <token>
\`\``

Get available exams for the authenticated student.

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "title": "Quiz 1",
    "class_name": "B7 - Section A",
    "duration_minutes": 30,
    "total_marks": 20,
    "attempt_id": null,
    "score": null,
    "status": "published"
  }
]
\`\`\`

### Start Exam
\`\`\`
POST /student/exam/{examId}/start
Authorization: Bearer <token>
\`\`\`

Initialize an exam attempt.

**Response (200):**
\`\`\`json
{
  "attemptId": "uuid",
  "startedAt": "2024-01-01T10:00:00Z",
  "questions": [
    {
      "id": "uuid",
      "question_text": "What is a computer?",
      "question_type": "mcq",
      "marks": 1,
      "options": [
        {
          "id": "uuid",
          "text": "Option A"
        }
      ]
    }
  ]
}
\`\`\`

### Submit Exam
\`\`\`
POST /student/exam/{examId}/submit
Authorization: Bearer <token>
\`\`\`

Submit exam answers and get results.

**Request Body:**
\`\`\`json
{
  "attemptId": "uuid",
  "responses": [
    {
      "questionId": "uuid",
      "selectedOptionId": "uuid",
      "textResponse": null
    }
  ]
}
\`\`\`

**Response (200):**
\`\`\`json
{
  "score": 78,
  "totalMarks": 100,
  "percentage": 78
}
\`\`\`

---

## Questions Endpoints

### Get Questions
\`\`\`
GET /questions?topicId={topicId}
Authorization: Bearer <token>
\`\``

Get all questions created by teacher (optionally filtered by topic).

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "question_text": "What is RAM?",
    "question_type": "mcq",
    "marks": 1,
    "difficulty_level": 1,
    "options": [
      {
        "id": "uuid",
        "text": "Random Access Memory",
        "order": 1,
        "isCorrect": true
      }
    ]
  }
]
\`\``

### Create Question
\`\`\`
POST /questions
Authorization: Bearer <token>
\`\``

Create a new question.

**Request Body:**
\`\`\`json
{
  "topicId": "uuid",
  "questionText": "What is RAM?",
  "questionType": "mcq",
  "marks": 1,
  "correctAnswer": "Random Access Memory",
  "explanation": "RAM stores data temporarily",
  "options": [
    {
      "text": "Random Access Memory",
      "isCorrect": true
    },
    {
      "text": "Read-Only Memory",
      "isCorrect": false
    }
  ]
}
\`\`\`

**Response (201):**
\`\`\`json
{
  "id": "uuid",
  "message": "Question created successfully"
}
\`\``

---

## Topics Endpoints

### Get Topics
\`\`\`
GET /topics?level={B7|B8}
\`\``

Get all topics for a specific class level.

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "title": "Introduction to Computers",
    "description": "Understanding computer basics",
    "class_level": "B7",
    "learning_outcomes": "Define computer...",
    "week_number": 1
  }
]
\`\``

### Get Topic Questions
\`\`\`
GET /topics/{topicId}/questions?limit=10
\`\``

Get practice questions for a topic.

**Response (200):**
\`\`\`json
[
  {
    "id": "uuid",
    "question_text": "What is a computer?",
    "question_type": "mcq",
    "options": [
      {
        "id": "uuid",
        "text": "Option A",
        "isCorrect": true
      }
    ]
  }
]
\`\``

---

## Analytics Endpoints

### Get Analytics
\`\`\`
GET /teacher/analytics
Authorization: Bearer <token>
\`\``

Get comprehensive analytics dashboard.

**Response (200):**
\`\`\`json
{
  "summary": {
    "avg_score": 75.5,
    "highest_score": 95,
    "lowest_score": 45,
    "total_submissions": 150,
    "passed_count": 120
  },
  "examBreakdown": [
    {
      "id": "uuid",
      "title": "Quiz 1",
      "avg_score": 78,
      "submissions": 30,
      "passed": 25
    }
  ],
  "studentPerformance": [
    {
      "id": "uuid",
      "full_name": "Ama Osei",
      "email": "ama@example.com",
      "avg_score": 85,
      "total_exams": 5,
      "passed_exams": 5
    }
  ]
}
\`\``

---

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "error": "Missing required fields"
}
\`\``

### 401 Unauthorized
\`\`\`json
{
  "error": "Invalid email or password"
}
\`\``

### 404 Not Found
\`\`\`json
{
  "error": "Exam not found"
}
\`\``

### 500 Internal Server Error
\`\`\`json
{
  "error": "Failed to create exam"
}
\`\``

---

## Rate Limiting
- 100 requests per minute for authenticated users
- 30 requests per minute for unauthenticated endpoints

## Status Codes
- \`200\` OK
- \`201\` Created
- \`400\` Bad Request
- \`401\` Unauthorized
- \`404\` Not Found
- \`500\` Server Error
\`\`\`

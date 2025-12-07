export interface User {
  id: string
  email: string
  fullName: string
  role: "teacher" | "student" | "admin"
  classLevel?: "B7" | "B8"
  studentId?: string
}

export interface Exam {
  id: string
  classId: string
  title: string
  description: string
  status: "draft" | "published" | "active" | "closed"
  durationMinutes: number
  totalMarks: number
  passingMarks: number
  startTime?: Date
  endTime?: Date
  createdBy: string
  createdAt: Date
}

export interface Question {
  id: string
  topicId: string
  questionText: string
  questionType: "mcq" | "true_false" | "fill_blank" | "essay"
  marks: number
  correctAnswer?: string
  explanation?: string
  options?: QuestionOption[]
  imageUrl?: string // Added imageUrl
  difficultyLevel?: string // Added difficultyLevel
}

export interface QuestionOption {
  id: string
  questionId: string
  text: string
  order: number
  isCorrect: boolean
}

export interface ExamAttempt {
  id: string
  examId: string
  studentId: string
  startedAt: Date
  submittedAt?: Date
  score?: number
  totalMarks?: number
  percentage?: number
  status: "in_progress" | "completed" | "submitted"
}

export interface StudentResponse {
  id: string
  attemptId: string
  questionId: string
  selectedOptionId?: string
  textResponse?: string
  isCorrect?: boolean
  marksAwarded?: number
}

export interface Topic {
  id: string
  title: string
  description: string
  classLevel: "B7" | "B8"
  learningOutcomes: string
  weekNumber: number
}

export interface Analytics {
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  totalSubmissions: number
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface RequestOptions extends RequestInit {
  token?: string
}

async function apiCall(endpoint: string, options: RequestOptions = {}) {
  const { token, ...restOptions } = options
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(restOptions.headers as Record<string, string>), // Cast to Record for spread
  })

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "API request failed")
  }

  return response.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: any) =>
    apiCall("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getUserProfile: (token: string) => apiCall("/api/profile", { token }),

  // Classes
  getClasses: (token: string) => apiCall("/api/classes", { token }),

  createClass: (token: string, data: any) =>
    apiCall("/api/classes", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Exams
  getExams: (token: string) => apiCall("/api/exams", { token }),

  createExam: (token: string, data: any) =>
    apiCall("/api/exams", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Questions
  getQuestions: (token: string, topicId?: string) => {
    const query = topicId ? `?topicId=${topicId}` : ""
    return apiCall(`/api/questions${query}`, { token })
  },

  createQuestion: (token: string, data: any) =>
    apiCall("/api/questions", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Topics
  getTopics: (classLevel?: string) => {
    const query = classLevel ? `?level=${classLevel}` : ""
    return apiCall(`/api/topics${query}`)
  },

  getTopicQuestions: (topicId: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ""
    return apiCall(`/api/topics/${topicId}/questions${query}`)
  },

  // Student Exams
  getStudentExams: (token: string) => apiCall("/api/student/exams", { token }),

  startExam: (token: string, examId: string) =>
    apiCall(`/api/student/exam/${examId}/start`, {
      method: "POST",
      token,
    }),

  submitExam: (token: string, examId: string, data: any) =>
    apiCall(`/api/student/exam/${examId}/submit`, {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  // Analytics
  getAnalytics: (token: string) => apiCall("/api/teacher/analytics", { token }),

  // AI Question Generation
  generateQuestions: (data: { type: string; topic: string; difficulty: string; count: number }) =>
    apiCall("/api/generate-questions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

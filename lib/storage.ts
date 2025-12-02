// Client-side storage utilities
export const storage = {
  setUser: (user: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user))
    }
  },

  getUser: () => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user")
      return user ? JSON.parse(user) : null
    }
    return null
  },

  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  },

  getToken: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token")
    }
    return null
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("user")
    }
  },

  setExamDraft: (examId: string, data: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`exam_draft_${examId}`, JSON.stringify(data))
    }
  },

  getExamDraft: (examId: string) => {
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(`exam_draft_${examId}`)
      return draft ? JSON.parse(draft) : null
    }
    return null
  },

  clearExamDraft: (examId: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`exam_draft_${examId}`)
    }
  },
}

"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { AuthToken } from "./auth"

interface AuthContextType {
  user: AuthToken | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthToken | null>(null)
  const [loading, setLoading] = useState(true)

  const decodeJwtPayload = (payload: string) => {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = JSON.parse(atob(base64))
    return json
  }

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      try {
        const payload = token.split(".")[1]
        const json = decodeJwtPayload(payload)
        const decodedUser: AuthToken = {
          userId: json.userId,
          email: json.email,
          role: json.role,
          classLevel: json.classLevel,
          iat: json.iat,
          exp: json.exp,
        }
        setUser(decodedUser)
      } catch {
        localStorage.removeItem("auth_token")
      }
    }
    setLoading(false)
  }, [])

  const login = (token: string) => {
    localStorage.setItem("auth_token", token)
    try {
      const payload = token.split(".")[1]
      const json = decodeJwtPayload(payload)
      const decodedUser: AuthToken = {
        userId: json.userId,
        email: json.email,
        role: json.role,
        classLevel: json.classLevel,
        iat: json.iat,
        exp: json.exp,
      }
      setUser(decodedUser)
    } catch {
      /* noop */
    }
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

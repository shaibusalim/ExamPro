"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Eye, EyeOff } from "lucide-react"
import { auth } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Login failed")
        return
      }

      const data = await response.json();

      // Store the token in localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
        login(data.token)
      } else {
        setError("Login successful, but no token received.");
        return;
      }

      // Ensure Firebase client SDK is authenticated so Firestore rules allow reads
      try {
        await signInWithEmailAndPassword(auth, email, password)
      } catch (firebaseErr) {
        // If Firebase client sign-in fails, still proceed with our JWT-based session,
        // but real-time listeners that rely on Firestore rules may not work.
        // We keep UX flowing and rely on server API checks.
      }

      // Redirect based on role
      if (data.user.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.user.role === "teacher") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md p-8 space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your ExamPro account</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Don\'t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </div>

        
      </Card>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { AdminNav } from "@/components/admin-nav"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-client"
import { TrendingUp, BarChart3, PieChartIcon } from "lucide-react"

interface ExamBreakdown {
  examId: string
  title: string
  avgScore: number
}

interface StudentPerformance {
  studentId: string
  fullName: string
  averageScore: number
  [key: string]: any
}

interface AnalyticsData {
  summary: {
    totalStudents: number
    totalExams: number
    avgPlatformScore: number
  }
  examBreakdown: ExamBreakdown[]
  studentPerformance: StudentPerformance[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const COLORS = ["#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    async function fetchAnalytics() {
      try {
        const [summaryRes, studentsRes] = await Promise.all([
          fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/analytics/students", { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const summaryData = summaryRes.ok
          ? await summaryRes.json()
          : { totalStudents: 0, totalExams: 0, avgPlatformScore: 0 }
        const studentsData = studentsRes.ok ? await studentsRes.json() : []

        setAnalytics({
          summary: {
            totalStudents: summaryData.totalStudents,
            totalExams: summaryData.totalExams,
            avgPlatformScore: Number.parseFloat(summaryData.avgPlatformScore?.toFixed(2) || "0"),
          },
          examBreakdown: summaryData.examBreakdown || [],
          studentPerformance: studentsData || [],
        })
      } catch (error) {
        console.error("Failed to fetch analytics data:", error)
        setAnalytics(null)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      if (user && user.role !== "admin") {
        router.push("/login")
        return
      }
      fetchAnalytics()
    }
  }, [router, authLoading, user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        <Spinner />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        <AdminNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Platform Analytics
            </h1>
          </div>
          <p className="text-slate-400">Failed to load analytics data.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Platform Analytics
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 bg-slate-900/40 border border-blue-900/30 backdrop-blur-sm hover:border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group cursor-default animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                  Total Students
                </div>
                <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  {analytics.summary.totalStudents}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900/40 border border-blue-900/30 backdrop-blur-sm hover:border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group cursor-default animate-fade-in delay-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                  Total Exams
                </div>
                <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  {analytics.summary.totalExams}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900/40 border border-blue-900/30 backdrop-blur-sm hover:border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 group cursor-default animate-fade-in delay-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                  Avg Platform Score
                </div>
                <div className="text-3xl font-bold mt-2 bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  {analytics.summary.avgPlatformScore}%
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 bg-slate-900/40 border border-blue-900/30 backdrop-blur-sm hover:border-blue-700/50 transition-all duration-300 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-100">Exam Performance Breakdown</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.examBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                <XAxis dataKey="title" stroke="rgba(148, 163, 184, 0.5)" />
                <YAxis stroke="rgba(148, 163, 184, 0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(96, 165, 250, 0.3)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="avgScore" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6 bg-slate-900/40 border border-blue-900/30 backdrop-blur-sm hover:border-blue-700/50 transition-all duration-300 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                <PieChartIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-100">Top 5 Student Performance</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.studentPerformance.slice(0, 5)}
                  dataKey="averageScore"
                  nameKey="fullName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ payload }) => `${payload.fullName}: ${payload.averageScore?.toFixed(0)}%`}
                  labelStyle={{ fill: "#e2e8f0", fontSize: "12px" }}
                >
                  {analytics.studentPerformance.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(96, 165, 250, 0.3)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </main>
    </div>
  )
}

import { Users } from "lucide-react"

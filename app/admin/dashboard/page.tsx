"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts"
import { useAuth } from "@/lib/auth-client"
import { Users, Award, Lock, TrendingUp } from "lucide-react"

interface AdminStudentSummary {
  id: string
  fullName: string
  email: string
  classLevel?: string
  studentId?: string
  lockedDashboard?: boolean
  lockedExams?: boolean
  totalExamsAttempted: number
  averageScore: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<AdminStudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      setLoading(false)
      return
    }
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login")
      setLoading(false)
      return
    }
    async function load() {
      try {
        const [studentsRes, analyticsRes] = await Promise.all([
          fetch("/api/admin/students", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (studentsRes.ok) {
          const s = await studentsRes.json()
          setStudents(Array.isArray(s) ? s : [])
        } else {
          setStudents([])
        }
        if (analyticsRes.ok) {
          const a = await analyticsRes.json()
          setAnalytics(a)
        } else {
          setAnalytics(null)
        }
      } catch {
        setStudents([])
        setAnalytics(null)
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading && user && user.role === "admin") {
      load()
    }
  }, [router, authLoading, user])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 space-y-2 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
            Welcome, Admin!
          </h1>
          <p className="text-slate-400 text-lg">Here's a quick overview of the platform performance.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Users, label: "Total Students", value: students.length, color: "from-blue-500 to-blue-600" },
            {
              icon: Award,
              label: "Average Score",
              value:
                students.length > 0
                  ? (students.reduce((sum, s) => sum + s.averageScore, 0) / students.length).toFixed(2)
                  : 0,
              color: "from-cyan-500 to-cyan-600",
            },
            {
              icon: Lock,
              label: "Locked Accounts",
              value: students.filter((s) => s.lockedDashboard || s.lockedExams).length,
              color: "from-red-500 to-red-600",
            },
          ].map((stat, idx) => {
            const Icon = stat.icon
            return (
              <Card
                key={idx}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6 hover:border-blue-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />

                <div className="relative flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                      {stat.label}
                    </p>
                    <div
                      className="text-4xl font-bold bg-gradient-to-r mt-3 bg-clip-text text-transparent"
                      style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}
                    >
                      <span className={`bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                        {stat.value}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`rounded-lg bg-gradient-to-br ${stat.color} p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {analytics && (
          <div className="space-y-8 mb-12">
            <div className="grid md:grid-cols-5 gap-4">
              {[
                {
                  label: "Avg Score",
                  value: `${Math.round(analytics.summary?.avg_score || 0)}%`,
                  icon: TrendingUp,
                  color: "from-blue-500 to-blue-600",
                },
                {
                  label: "Highest",
                  value: `${analytics.summary?.highest_score || 0}%`,
                  icon: Award,
                  color: "from-green-500 to-green-600",
                },
                {
                  label: "Lowest",
                  value: `${analytics.summary?.lowest_score || 0}%`,
                  icon: TrendingUp,
                  color: "from-orange-500 to-orange-600",
                },
                {
                  label: "Pass Rate",
                  value: `${analytics.summary?.total_submissions > 0 ? Math.round((analytics.summary?.passed_count / analytics.summary?.total_submissions) * 100) : 0}%`,
                  icon: Award,
                  color: "from-purple-500 to-purple-600",
                },
                {
                  label: "Submissions",
                  value: analytics.summary?.total_submissions || 0,
                  icon: Users,
                  color: "from-cyan-500 to-cyan-600",
                },
              ].map((metric, idx) => {
                const Icon = metric.icon
                return (
                  <Card
                    key={idx}
                    className="group bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/50 p-5 hover:border-blue-500/50 transition-all duration-500 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-wider">
                          {metric.label}
                        </p>
                        <p
                          className={`text-2xl font-bold mt-2 bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}
                        >
                          {metric.value}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg bg-gradient-to-br ${metric.color} p-2 opacity-20 group-hover:opacity-100 transition-opacity duration-300`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6 hover:border-blue-500/50 transition-all duration-500 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-200">Pass/Fail Distribution</h3>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Passed", value: analytics.summary?.passed_count || 0, fill: "#10b981" },
                        {
                          name: "Failed",
                          value: (analytics.summary?.total_submissions || 0) - (analytics.summary?.passed_count || 0),
                          fill: "#ef4444",
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: any) => `${name}: ${value}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-6 hover:border-blue-500/50 transition-all duration-500 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-200">Average Score by Exam</h3>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.examBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="title" width={80} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }}
                    />
                    <Bar dataKey="avg_score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        <Card className="group bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 p-8 text-center hover:border-blue-400/50 transition-all duration-500 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10">
          <p className="text-slate-300 text-lg">
            Navigate using the menu to manage students, questions, exams, and view detailed analytics.
          </p>
        </Card>
      </main>
    </div>
  )
}

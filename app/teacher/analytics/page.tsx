"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TeacherNav } from "@/components/teacher-nav"
import { Spinner } from "@/components/ui/spinner"

interface Analytics {
  summary: {
    avg_score: number
    highest_score: number
    lowest_score: number
    total_submissions: number
    passed_count: number
  }
  examBreakdown: any[]
  studentPerformance: any[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    fetch("/api/teacher/analytics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    )
  }

  const passRate =
    analytics.summary.total_submissions > 0
      ? Math.round((analytics.summary.passed_count / analytics.summary.total_submissions) * 100)
      : 0

  const chartData = [
    { name: "Passed", value: analytics.summary.passed_count, fill: "#10b981" },
    { name: "Failed", value: analytics.summary.total_submissions - analytics.summary.passed_count, fill: "#ef4444" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TeacherNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">View student performance and exam statistics</p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-12">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Average Score</div>
            <div className="text-3xl font-bold mt-2">{Math.round(analytics.summary.avg_score || 0)}%</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Highest Score</div>
            <div className="text-3xl font-bold mt-2">{analytics.summary.highest_score || 0}%</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Lowest Score</div>
            <div className="text-3xl font-bold mt-2">{analytics.summary.lowest_score || 0}%</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Pass Rate</div>
            <div className="text-3xl font-bold mt-2">{passRate}%</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Responses</div>
            <div className="text-3xl font-bold mt-2">{analytics.summary.total_submissions}</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Pass/Fail Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Pass/Fail Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Exam Performance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Average Score by Exam</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.examBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" width={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg_score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Student Performance Table */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Student Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-3 px-4">Student Name</th>
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-center py-3 px-4">Avg Score</th>
                  <th className="text-center py-3 px-4">Total Exams</th>
                  <th className="text-center py-3 px-4">Passed</th>
                </tr>
              </thead>
              <tbody>
                {analytics.studentPerformance.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{student.full_name}</td>
                    <td className="py-3 px-4">{student.email}</td>
                    <td className="text-center py-3 px-4">{Math.round(student.avg_score || 0)}%</td>
                    <td className="text-center py-3 px-4">{student.total_exams}</td>
                    <td className="text-center py-3 px-4">{student.passed_exams}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}

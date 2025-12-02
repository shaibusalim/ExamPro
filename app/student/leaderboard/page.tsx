"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { StudentNav } from "@/components/student-nav"
import { Spinner } from "@/components/ui/spinner"
import { Trophy } from "lucide-react"

interface StudentScore {
  id: string
  full_name: string
  avg_score: number
  total_exams: number
  passed_exams: number
}

export default function LeaderboardPage() {
  const [students, setStudents] = useState<StudentScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - would fetch from API
    const mockData: StudentScore[] = [
      { id: "1", full_name: "Ama Osei", avg_score: 92, total_exams: 5, passed_exams: 5 },
      { id: "2", full_name: "Kofi Asante", avg_score: 87, total_exams: 5, passed_exams: 5 },
      { id: "3", full_name: "Abena Boateng", avg_score: 85, total_exams: 4, passed_exams: 4 },
      { id: "4", full_name: "Yaw Mensah", avg_score: 78, total_exams: 5, passed_exams: 4 },
    ]
    setStudents(mockData)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-2">Top performing students</p>
        </div>

        <div className="space-y-4">
          {students.map((student, index) => (
            <Card key={student.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-10">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </div>
                  <div>
                    <h3 className="font-semibold">{student.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{student.total_exams} exams taken</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{student.avg_score}%</div>
                  <p className="text-xs text-muted-foreground">{student.passed_exams} passed</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { TeacherNav } from "@/components/teacher-nav"

interface Exam {
  id: string
  title: string
  class_name: string
  status: string
  total_attempts: number
  total_marks: number
  duration_minutes: number
  created_at: string
  level: string // Added level property
}

interface StudentPerformance {
  id: string;
  fullName: string;
  email: string;
  class_id: string;
  class_name: string;
  class_level: string;
  total_exams_attempted: number;
  average_score: number;
}

interface Class {
  id: string
  name: string
  level: string
  student_count: number
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [studentsPerformance, setStudentsPerformance] = useState<StudentPerformance[]>([]) // New state for student data
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    Promise.all([
      fetch("/api/exams", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/classes", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/teacher/analytics/students", { // Fetch student performance data
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]).then(async ([examsRes, classesRes, studentsRes]) => { // Added studentsRes
      // Handle exams response
      if (!examsRes.ok) {
        console.error("Failed to fetch exams. Status:", examsRes.status, examsRes.statusText);
        setExams([]);
      } else {
        const examsData = await examsRes.json();
        if (Array.isArray(examsData)) {
          setExams(examsData);
        } else {
          console.error("Failed to fetch exams: Data is not an array.", examsData);
          setExams([]);
        }
      }

      // Handle classes response
      if (!classesRes.ok) {
        console.error("Failed to fetch classes. Status:", classesRes.status, classesRes.statusText);
        setClasses([]);
      } else {
        const classesData = await classesRes.json();
        if (Array.isArray(classesData)) {
          setClasses(classesData);
        } else {
          console.error("Failed to fetch classes: Data is not an array.", classesData);
          setClasses([]);
        }
      }

      // Handle students performance response
      if (!studentsRes.ok) {
        console.error("Failed to fetch student performance. Status:", studentsRes.status, studentsRes.statusText);
        setStudentsPerformance([]);
      } else {
        const studentsData = await studentsRes.json();
        if (Array.isArray(studentsData)) {
          setStudentsPerformance(studentsData);
        } else {
          console.error("Failed to fetch student performance: Data is not an array.", studentsData);
          setStudentsPerformance([]);
        }
      }

      setLoading(false);
    }).catch(error => {
      console.error("Error during data fetching in TeacherDashboard:", error);
      setExams([]);
      setClasses([]);
      setStudentsPerformance([]);
      setLoading(false);
    });
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your classes and exams</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Classes</div>
            <div className="text-3xl font-bold mt-2">{classes.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Exams</div>
            <div className="text-3xl font-bold mt-2">{exams.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Responses</div>
            <div className="text-3xl font-bold mt-2">{exams.reduce((sum, e) => sum + e.total_attempts, 0)}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-muted-foreground">Total Students</div>
            <div className="text-3xl font-bold mt-2">{classes.reduce((sum, c) => sum + c.student_count, 0)}</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="exams" className="space-y-6">
          <TabsList>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger> {/* New tab trigger */}
          </TabsList>

          <TabsContent value="exams" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Exams</h2>
              <Link href="/teacher/exams/create">
                <Button>Create Exam</Button>
              </Link>
            </div>

            {exams.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No exams yet. Create your first exam!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {exams.map((exam) => (
                  <Card key={exam.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{exam.title}</h3>
                        <p className="text-sm text-muted-foreground">{exam.class_name}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge>{exam.level}</Badge>
                          <Badge variant="outline">{exam.total_attempts} responses</Badge>
                        </div>
                      </div>
                      <Button variant="outline">View Details</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Classes</h2>
              <Link href="/teacher/classes/create">
                <Button>Create Class</Button>
              </Link>
            </div>

            {classes.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No classes yet. Create your first class!</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {classes.map((classItem) => (
                  <Card key={classItem.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">{classItem.name}</h3>
                        <p className="text-sm text-muted-foreground">{classItem.level}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{classItem.student_count} students</span>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* New Students Performance Tab */}
          <TabsContent value="students" className="space-y-4">
            <h2 className="text-2xl font-bold">Student Performance</h2>
            {studentsPerformance.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No student performance data available.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {studentsPerformance.map((student) => (
                  <Card key={student.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{student.fullName}</h3>
                      <p className="text-sm text-muted-foreground">Class: {student.class_name} ({student.class_level})</p>
                      <p className="text-sm text-muted-foreground">Email: {student.email}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">Exams Attempted: {student.total_exams_attempted}</Badge>
                        <Badge variant="secondary">Average Score: {student.average_score}%</Badge>
                      </div>
                      {/* You might add a link to a student-specific analytics page here */}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

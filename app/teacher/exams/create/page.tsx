"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { TeacherNav } from "@/components/teacher-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Class {
  id: string
  name: string
  level: string
}

interface Question {
  id: string
  question_text: string
  marks: number
}

export default function CreateExamPage() {
  console.log("CreateExamPage component rendering..."); // Debugging
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    classId: "",
    title: "",
    description: "",
    durationMinutes: 60,
    totalMarks: 100,
    passingMarks: 50,
  })

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])

  useEffect(() => {
    console.log("CreateExamPage useEffect triggered."); // Debugging
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      return
    }

    setToken(savedToken)

    Promise.all([
      fetch("/api/classes", {
        headers: { Authorization: `Bearer ${savedToken}` },
      }),
      fetch("/api/questions", {
        headers: { Authorization: `Bearer ${savedToken}` },
      }),
    ])
      .then(async ([classRes, qRes]) => {
        // Handle classes response
        if (!classRes.ok) {
          console.error("Failed to fetch classes. Status:", classRes.status, classRes.statusText);
          setClasses([]);
        } else {
          const classData = await classRes.json();
          if (Array.isArray(classData)) {
            const fetchedClasses = classData.length > 0 ? classData : [
              { id: "b7-dummy-id", name: "B7", level: "Grade 7" },
              { id: "b8-dummy-id", name: "B8", level: "Grade 8" },
            ];
            setClasses(fetchedClasses);
            console.log("Fetched classes:", fetchedClasses); // Debugging
          } else {
            console.error("Failed to fetch classes: Data is not an array.", classData);
            setClasses([
              { id: "b7-dummy-id", name: "B7", level: "Grade 7" },
              { id: "b8-dummy-id", name: "B8", level: "Grade 8" },
            ]); // Add dummy classes on error
          }
        }

        // Handle questions response
        if (!qRes.ok) {
          console.error("Failed to fetch questions. Status:", qRes.status, qRes.statusText);
          setQuestions([{ id: "dummy-q-1", question_text: "What is 2+2?", marks: 1 }]); // Add dummy question on error
        } else {
          const qData = await qRes.json();
          if (Array.isArray(qData)) {
            const fetchedQuestions = qData.length > 0 ? qData : [{ id: "dummy-q-1", question_text: "What is 2+2?", marks: 1 }];
            setQuestions(fetchedQuestions);
            console.log("Fetched questions:", fetchedQuestions); // Debugging
          } else {
            console.error("Failed to fetch questions: Data is not an array.", qData);
            setQuestions([{ id: "dummy-q-1", question_text: "What is 2+2?", marks: 1 }]); // Add dummy question on error
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error during data fetching in CreateExamPage:", err);
        setError("Failed to load data");
        setClasses([
          { id: "b7-dummy-id", name: "B7", level: "Grade 7" },
          { id: "b8-dummy-id", name: "B8", level: "Grade 8" },
        ]); // Ensure classes is an array on fetch error
        setQuestions([{ id: "dummy-q-1", question_text: "What is 2+2?", marks: 1 }]); // Ensure questions is an array on fetch error
        setLoading(false);
      })
  }, [router])

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.classId || !formData.title || selectedQuestions.length === 0) {
      setError("Please fill all required fields and select questions")
      return
    }

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: formData.classId,
          title: formData.title,
          description: formData.description,
          durationMinutes: formData.durationMinutes,
          totalMarks: formData.totalMarks,
          passingMarks: formData.passingMarks,
          questions: selectedQuestions.map((qId) => ({
            id: qId,
            marks: questions.find((q) => q.id === qId)?.marks || 1,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to create exam")
        return
      }

      setSuccess("Exam created successfully!")
      setTimeout(() => {
        router.push("/teacher/dashboard")
      }, 2000)
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    }
  }

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

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Create New Exam</h1>
          <p className="text-muted-foreground mt-2">Design and configure your exam</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleCreateExam} className="space-y-8">
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Exam Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class *</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => setFormData({ ...formData, classId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Mid-Term Examination"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Exam instructions and details"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number.parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalMarks">Total Marks *</Label>
                <Input
                  id="totalMarks"
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: Number.parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingMarks">Passing Marks *</Label>
                <Input
                  id="passingMarks"
                  type="number"
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: Number.parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Select Questions */}
          <Card className="p-6 space-y-6">
            <h2 className="text-xl font-semibold">Select Questions</h2>

            {questions.length === 0 ? (
              <Alert>
                <AlertDescription>No questions available. Create questions first.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {questions.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedQuestions(
                        selectedQuestions.includes(question.id)
                          ? selectedQuestions.filter((id) => id !== question.id)
                          : [...selectedQuestions, question.id],
                      )
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{question.question_text}</p>
                      <p className="text-sm text-muted-foreground">{question.marks} mark(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground">{selectedQuestions.length} question(s) selected</div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Exam
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

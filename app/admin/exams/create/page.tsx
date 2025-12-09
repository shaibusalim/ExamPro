"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { AdminNav } from "@/components/admin-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

// Define interfaces for better type safety
interface ClassItem {
  id: string;
  name: string;
  level: string;
}

interface QuestionItem {
  id: string;
  question: string;
  type: "objective" | "theory";
  imageUrl?: string;
  marks?: number;
}

export default function CreateExamPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")

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
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      return
    }
    setToken(savedToken)

    // fetch classes
    fetch("/api/classes", { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((res) => res.json())
      .then((data: ClassItem[]) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false))

  }, [router])

  // fetch questions filtered by class level
  const fetchQuestionBank = async (classId: string) => {
    setLoading(true)
    try {
      const cls = classes.find(c => c.id === classId)
      const level = cls?.level || ""
      const res = await fetch(`/api/admin/questions?classLevel=${encodeURIComponent(level)}` , {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const normalized: QuestionItem[] = Array.isArray(data)
        ? data.map((q: any) => {
            const qt = String(q.questionType || '').toLowerCase()
            const type: "objective" | "theory" = qt === 'essay' ? 'theory' : 'objective'
            return {
              id: q.id,
              question: q.questionText || q.question || '',
              type,
              imageUrl: q.imageUrl || undefined,
              marks: typeof q.marks === 'number' ? q.marks : 1,
            }
          })
        : []
      setQuestions(normalized)
      setSelectedQuestions([])
    } catch (err) {
      console.error("Failed to fetch question bank:", err)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.classId || !formData.title || selectedQuestions.length === 0) {
      setError("Please fill all required fields and select questions")
      return
    }

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          questions: selectedQuestions.map((qId) => {
            const q = questions.find((qItem) => qItem.id === qId)
            return { id: q?.id, marks: q?.marks || 1 }
          }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create exam")
        return
      }

      setSuccess("Exam created successfully!")
      setTimeout(() => router.push("/admin/exams/manage"), 2000)
    } catch (err) {
      setError("An error occurred. Please try again.")
    }
  }

  if (loading) {
    return ( <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"> <Spinner /> </div>
    )
  }

  return ( <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5"> <AdminNav /> <main className="max-w-4xl mx-auto px-4 py-12">
    {error && ( <Alert variant="destructive" className="mb-6"> <AlertDescription>{error}</AlertDescription> </Alert>
    )}
    {success && ( <Alert className="mb-6"> <AlertDescription>{success}</AlertDescription> </Alert>
    )}

        <form onSubmit={handleCreateExam} className="space-y-6">
          <Card className="p-6 bg-card border border-primary/20">
            <h2 className="text-xl font-semibold mb-4">Exam Details</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Class *</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, classId: value })
                    fetchQuestionBank(value)
                  }}
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

              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label>Total Marks *</Label>
                <Input
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) => setFormData({ ...formData, totalMarks: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label>Passing Marks *</Label>
                <Input
                  type="number"
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Question Selection */}
          <Card className="p-6 bg-card border border-primary/20">
            <h2 className="text-xl font-semibold mb-4">Select Questions</h2>
            {questions.length === 0 ? (
              <p>No questions available for this class. Add them to the question bank first.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    checked={selectedQuestions.length > 0 && selectedQuestions.length === questions.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQuestions(questions.map(q => q.id))
                      } else {
                        setSelectedQuestions([])
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 border border-border rounded flex items-start gap-3 hover:bg-primary/10"
                    >
                      <Checkbox
                        checked={selectedQuestions.includes(q.id)}
                        onCheckedChange={(checked) => {
                          setSelectedQuestions((prev) => {
                            if (checked) {
                              return prev.includes(q.id) ? prev : [...prev, q.id]
                            } else {
                              return prev.filter((id) => id !== q.id)
                            }
                          })
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{q.question}</p>
                        {q.type === "theory" && q.imageUrl && (
                          <img src={q.imageUrl} alt="Diagram" className="mt-2 max-w-full rounded-lg" />
                        )}
                        <p className="text-sm text-muted-foreground">{q.marks || 1} mark(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-4">{selectedQuestions.length} question(s) selected</div>
          </Card>

          <Button type="submit" className="w-full">
            Create Exam
          </Button>
        </form>
      </main>
    </div>

  )
}

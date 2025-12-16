"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react" // Added useCallback
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { AdminNav } from "@/components/admin-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Plus, Eye, Image as ImageIcon } from "lucide-react"
// removed direct firebase storage imports; will lazy-import at runtime
import { type Question } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

interface Topic {
  id: string
  title: string
  class_level: "B7" | "B8"
  weekNumber: number
  description: string
}

export default function QuestionsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [classLevel, setClassLevel] = useState<"B7" | "B8">("B7")
  const [activeForm, setActiveForm] = useState<"single" | "bulk" | null>(null) // New state for active form
  const [editOpen, setEditOpen] = useState(false)
  const [editQuestion, setEditQuestion] = useState<Question | null>(null)
  const [editText, setEditText] = useState("")
  const [editMarks, setEditMarks] = useState<number>(1)
  const [editRubricPoints, setEditRubricPoints] = useState<Array<{ point: string; weight: number }>>([])

  const [formData, setFormData] = useState({
    topicId: "",
    questionText: "",
    questionType: "mcq",
    marks: 1,
    correctAnswer: "",
    explanation: "",
    options: ["", "", "", ""],
    imageFile: null as File | null,
    classLevel: classLevel,
  })

  const resetSingleQuestionForm = useCallback(() => {
    setFormData({
      topicId: "",
      questionText: "",
      questionType: "mcq",
      marks: 1,
      correctAnswer: "",
      explanation: "",
      options: ["", "", "", ""],
      imageFile: null,
      classLevel: classLevel,
    })
    setUploadedImageUrl(null)
    setIsUploadingImage(false)
  }, [classLevel])

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      return
    }

    setToken(savedToken)

    const fetchQuestionsAndTopics = async () => {
      setLoading(true)
      try {
        const [topicsRes, questionsRes] = await Promise.all([
          fetch(`/api/topics?classLevel=${classLevel}`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          }),
          fetch(`/api/admin/questions?classLevel=${classLevel}`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          }),
        ])

        if (!topicsRes.ok) {
          setTopics([])
        } else {
          const topicsData = await topicsRes.json()
          if (Array.isArray(topicsData)) {
            const sortedTopics = (topicsData as Topic[]).sort((a, b) => {
              const weekA = a.weekNumber !== undefined && a.weekNumber !== null ? a.weekNumber : Number.POSITIVE_INFINITY
              const weekB = b.weekNumber !== undefined && b.weekNumber !== null ? b.weekNumber : Number.POSITIVE_INFINITY
              if (weekA === weekB) {
                return a.title.localeCompare(b.title)
              }
              return weekA - weekB
            })
            setTopics(sortedTopics)
          } else {
            setTopics([])
          }
        }

        if (!questionsRes.ok) {
          setQuestions([])
        } else {
          const questionsData = await questionsRes.json()
          if (Array.isArray(questionsData)) {
            setQuestions(questionsData)
          } else {
            setQuestions([])
          }
        }
        setLoading(false)
      } catch (err) {
        console.error("Error during data fetching:", err)
        setError("Failed to load data")
        setTopics([])
        setQuestions([])
        setLoading(false)
      }
    }

    fetchQuestionsAndTopics()
  }, [router, token, classLevel])

  function openEdit(q: Question) {
    setEditQuestion(q)
    setEditText(String((q as any).questionText || (q as any).question || ""))
    setEditMarks(typeof (q as any).marks === "number" ? (q as any).marks : 1)
    const kp = ((q as any).rubric && Array.isArray((q as any).rubric.keyPoints)) ? ((q as any).rubric.keyPoints as Array<any>) : []
    setEditRubricPoints(kp.map((p) => ({ point: String(p.point || ""), weight: Number(p.weight || 1) })))
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editQuestion) return
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/admin/questions/${editQuestion.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionText: editText,
          marks: editMarks,
          rubric: {
            keyPoints: editRubricPoints
              .filter((p) => String(p.point || "").trim().length > 0)
              .map((p) => ({ point: String(p.point).trim(), weight: Number(p.weight || 1) })),
          },
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        setError(body?.error || "Failed to update question")
        return
      }
      const updated = await res.json()
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === editQuestion.id
            ? ({ ...q, questionText: updated.questionText, marks: updated.marks, rubric: updated.rubric } as any)
            : q,
        ),
      )
      setEditOpen(false)
      setSuccess("Question updated")
    } catch (e) {
      setError("Failed to update question")
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.topicId || !formData.questionText || !formData.classLevel) {
      setError("Please select a class level and fill all required fields")
      return
    }

    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          classLevel: formData.classLevel,
          options:
            formData.questionType === "mcq" || formData.questionType === "true_false"
              ? formData.options.map((text, idx) => ({
                  text,
                  isCorrect: text === formData.correctAnswer,
                }))
              : [],
          imageUrl: uploadedImageUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to create question")
        return
      }

      setSuccess("Question created successfully!")
      resetSingleQuestionForm() // Reset the form after successful submission
    } catch (err) {
      setError("An error occurred. Please try again.")
    }
  }

  async function deleteQuestion(id: string) {
    if (!id) return
    if (!window.confirm("Delete this question? This cannot be undone.")) return
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        setError(body?.error || "Failed to delete question")
        return
      }
      setQuestions((prev) => prev.filter((q) => q.id !== id))
      setSuccess("Question deleted")
    } catch (e) {
      setError("Failed to delete question")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <AdminNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                Question Bank
              </h1>
              <p className="text-slate-400 mt-1">Create and manage exam questions</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30 text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-500/10 border-green-500/30">
            <AlertDescription className="text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-blue-500/20">
            <TabsTrigger
              value="create"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Question
            </TabsTrigger>
            <TabsTrigger
              value="browse"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
            >
              <Eye className="w-4 h-4 mr-2" />
              Browse Questions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <form onSubmit={handleCreateQuestion} className="space-y-6">
              <Card className="p-6 space-y-6 bg-gradient-to-br from-slate-800/50 to-blue-900/20 border border-blue-500/20">
                <h2 className="text-xl font-semibold text-slate-100">Question Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="classLevel" className="text-slate-300">
                    Class Level *
                  </Label>
                  <Select
                    value={classLevel}
                    onValueChange={(value: "B7" | "B8") => {
                      setClassLevel(value)
                      setFormData((prev) => ({ ...prev, classLevel: value, topicId: "" }))
                      setActiveForm(null) // Reset active form on class level change
                    }}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-slate-100">
                      <SelectValue placeholder="Select class level" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-blue-500/20">
                      <SelectItem value="B7">Basic 7</SelectItem>
                      <SelectItem value="B8">Basic 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-slate-300">
                    Topic *
                  </Label>
                  <Select
                    value={formData.topicId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, topicId: value })
                      setActiveForm("single") // Activate single form on topic selection
                    }}
                    disabled={activeForm === "bulk"} // Disable if bulk is active
                  >
                    <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-slate-100">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-blue-500/20">
                      {topics
                        .filter((topic) => topic.class_level === classLevel)
                        .map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.title} ({topic.class_level})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionType" className="text-slate-300">
                    Question Type *
                  </Label>
                  <Select
                    value={formData.questionType}
                    onValueChange={(value) => {
                      setFormData({ ...formData, questionType: value })
                      setActiveForm("single") // Activate single form on type selection
                    }}
                    disabled={activeForm === "bulk"}
                  >
                    <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-blue-500/20">
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionText" className="text-slate-300">
                    Question Text *
                  </Label>
                  <Textarea
                    id="questionText"
                    placeholder="Enter the question"
                    value={formData.questionText}
                    onChange={(e) => {
                      setFormData({ ...formData, questionText: e.target.value })
                      setActiveForm("single") // Activate single form on text input
                    }}
                    required
                    rows={3}
                    className="bg-slate-900/50 border-blue-500/20 text-slate-100 placeholder-slate-500"
                    disabled={activeForm === "bulk"}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marks" className="text-slate-300">
                      Marks
                    </Label>
                    <Input
                      id="marks"
                      type="number"
                      value={formData.marks === 0 ? "" : formData.marks}
                      onChange={(e) => {
                        const value = Number(e.target.value)
                        setFormData({ ...formData, marks: isNaN(value) ? 0 : value })
                        setActiveForm("single") // Activate single form on marks input
                      }}
                      className="bg-slate-900/50 border-blue-500/20 text-slate-100"
                      disabled={activeForm === "bulk"}
                    />
                  </div>

                  {(formData.questionType === "mcq" || formData.questionType === "true_false") && (
                    <div className="space-y-2">
                      <Label htmlFor="correctAnswer" className="text-slate-300">
                        Correct Answer *
                      </Label>
                      <Select
                        value={formData.correctAnswer}
                        onValueChange={(value) => {
                          setFormData({ ...formData, correctAnswer: value })
                          setActiveForm("single") // Activate single form on correct answer selection
                        }}
                        disabled={activeForm === "bulk"}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-blue-500/20 text-slate-100">
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-blue-500/20">
                          {formData.options.map(
                            (opt, idx) =>
                              opt && (
                                <SelectItem key={idx} value={opt}>
                                  {opt}
                                </SelectItem>
                              ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {(formData.questionType === "mcq" || formData.questionType === "true_false") && (
                  <div className="space-y-4">
                    <Label className="text-slate-300">Options</Label>
                    {formData.options.map((option, idx) => (
                      <Input
                        key={idx}
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options]
                          newOptions[idx] = e.target.value
                          setFormData({ ...formData, options: newOptions })
                          setActiveForm("single") // Activate single form on option input
                        }}
                        className="bg-slate-900/50 border-blue-500/20 text-slate-100 placeholder-slate-500"
                        disabled={activeForm === "bulk"}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="explanation" className="text-slate-300">
                    Explanation
                  </Label>
                  <Textarea
                    id="explanation"
                    placeholder="Explain the correct answer"
                    value={formData.explanation}
                    onChange={(e) => {
                      setFormData({ ...formData, explanation: e.target.value })
                      setActiveForm("single") // Activate single form on explanation input
                    }}
                    rows={2}
                    className="bg-slate-900/50 border-blue-500/20 text-slate-100 placeholder-slate-500"
                    disabled={activeForm === "bulk"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image" className="text-slate-300">
                    Question Image (Optional)
                  </Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      setActiveForm("single") // Activate single form on image selection
                      const file = e.target.files?.[0]
                      if (file) {
                        setFormData({ ...formData, imageFile: file })
                        setError("")
                        setIsUploadingImage(true)
                        try {
                          const { storage } = await import("@/lib/firebase")
                          const { uploadBytes, ref, getDownloadURL } = await import("firebase/storage")
                          const storageRef = ref(storage, `question_images/${file.name}`)
                          const snapshot = await uploadBytes(storageRef, file)
                          const downloadURL = await getDownloadURL(snapshot.ref)
                          setUploadedImageUrl(downloadURL)
                          setSuccess("Image uploaded successfully!")
                        } catch (err) {
                          console.error("Error uploading image:", err)
                          setError("Failed to upload image")
                          setUploadedImageUrl(null)
                        } finally {
                          setIsUploadingImage(false)
                        }
                      }
                    }}
                    className="bg-slate-900/50 border-blue-500/20 text-slate-100 file:text-blue-300 file:bg-blue-900/30 file:border-blue-500/20 file:border"
                    disabled={activeForm === "bulk"}
                  />
                  {isUploadingImage && <Spinner className="mt-2" />}
                  {uploadedImageUrl && (
                    <div className="mt-4">
                      <p className="text-slate-300 text-sm mb-2">Image Preview:</p>
                      <img src={uploadedImageUrl} alt="Question Preview" className="max-w-xs h-auto rounded-md shadow-md" />
                    </div>
                  )}
                </div>
              </Card>

              <Card
                className={`p-6 space-y-6 bg-gradient-to-br from-slate-800/50 to-blue-900/20 border border-blue-500/20 ${
                  activeForm === "single" ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <h2 className="text-xl font-semibold text-slate-100">Bulk Upload Questions</h2>
                <div className="space-y-2">
                  <Label htmlFor="bulkUploadFile" className="text-slate-300">
                    Upload JSON or CSV file
                  </Label>
                  <Input
  id="bulkUploadFile"
  type="file"
  accept=".json"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    try {
      const text = await file.text();
      const questionsData = JSON.parse(text);

      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        setError("JSON must be an array of questions");
        return;
      }

      const topicIds = topics
        .filter(t => t.class_level === classLevel)
        .map(t => t.id);

      if (topicIds.length === 0) {
        setError("No topics found for this class level");
        return;
      }

      const res = await fetch("/api/admin/questions/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: questionsData,
          topicIds,
          classLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSuccess(`Successfully uploaded ${questionsData.length} questions!`);

      const refreshed = await fetch(`/api/admin/questions?classLevel=${classLevel}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!refreshed.ok) {
        setQuestions([]);
      } else {
        const newQuestions = await refreshed.json();
        setQuestions(Array.isArray(newQuestions) ? newQuestions : []);
      }

    } catch (err: any) {
      setError(err.message || "Failed to upload questions");
      console.error(err);
    }
  }}
  className="bg-slate-900/50 border-blue-500/20 text-slate-100"
  disabled={activeForm === "single"} // Disable if single is active
/>
                    
                  
                </div>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30"
                  disabled={activeForm === "bulk" || (!formData.topicId || !formData.questionText)} // Disable if bulk is active or form is invalid
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">All Questions ({Array.isArray(questions) ? questions.length : 0})</h2>
            {!Array.isArray(questions) || questions.length === 0 ? (
              <Card className="p-12 text-center bg-gradient-to-br from-slate-800/50 to-blue-900/20 border border-blue-500/20">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No questions available. Create questions or use AI to generate some!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {questions.map((question, idx) => (
                  <Card
                    key={question.id}
                    className="p-6 bg-gradient-to-r from-slate-800/50 to-blue-900/20 border border-blue-500/20 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-slate-100 flex-1">{question.questionText}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {question.questionType.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {question.marks} mark(s)
                        </Badge>
                      </div>
                      {question.questionType === "mcq" || question.questionType === "true_false" ? (
                        <div className="mt-3 text-sm text-slate-300 bg-slate-900/30 p-3 rounded-lg">
                          <p className="font-semibold text-slate-200 mb-2">Options:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {question.options?.map((option, i) => (
                              <li key={i} className={option.isCorrect ? "text-green-300 font-semibold" : ""}>
                                {option.text} {option.isCorrect && "✓ (Correct)"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        (Array.isArray((question as any).correctAnswer) || question.correctAnswer) && (
                          <div className="mt-3 text-sm text-slate-300 bg-slate-900/30 p-3 rounded-lg">
                            <p className="font-semibold text-slate-200 mb-2">Correct Answers:</p>
                            {Array.isArray((question as any).correctAnswer) ? (
                              <ul className="list-disc pl-5 space-y-1">
                                {((question as any).correctAnswer as string[]).filter(Boolean).map((ans, i) => (
                                  <li key={i} className="text-green-300">{ans}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-green-300 mt-1">{String(question.correctAnswer)}</p>
                            )}
                          </div>
                        )
                      )}
                      {((question as any).rubric && Array.isArray((question as any).rubric.keyPoints) && (question as any).rubric.keyPoints.length > 0) && (
                        <div className="mt-3 text-sm text-slate-300 bg-slate-900/30 p-3 rounded-lg">
                          <p className="font-semibold text-slate-200 mb-2">Key Points (Rubric):</p>
                          <div className="space-y-2">
                            {((question as any).rubric.keyPoints as Array<any>).map((kp, i) => (
                              <div key={i} className="border border-blue-500/20 rounded-md p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium text-slate-200">{String(kp.point || "")}</div>
                                  <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{Number(kp.weight || 1)} pt</Badge>
                                </div>
                                {Array.isArray(kp.synonyms) && kp.synonyms.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {kp.synonyms.map((s: string, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-slate-800/50 border border-blue-500/20 text-slate-300">{s}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {question.explanation && (
                        <div className="mt-3 text-sm text-slate-300 bg-slate-900/30 p-3 rounded-lg">
                          <p className="font-semibold text-slate-200 mb-1">Explanation:</p>
                          <p className="text-slate-300">{question.explanation}</p>
                        </div>
                      )}
                      <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={() => openEdit(question)}>
                          Edit
                        </Button>
                        <Button onClick={() => deleteQuestion(question.id)} className="bg-red-600 hover:bg-red-700 text-white">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Question</DialogTitle>
              <DialogDescription>Update the question text, marks, and rubric key points</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-text">Question</Label>
                <Textarea id="edit-text" value={editText} onChange={(e) => setEditText(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-marks">Marks</Label>
                <Input
                  id="edit-marks"
                  type="number"
                  min={0}
                  value={editMarks}
                  onChange={(e) => setEditMarks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rubric Key Points</Label>
                <div className="space-y-3">
                  {editRubricPoints.map((kp, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <Input
                        className="col-span-8"
                        placeholder="Key point"
                        value={kp.point}
                        onChange={(e) => {
                          const next = [...editRubricPoints]
                          next[idx] = { ...next[idx], point: e.target.value }
                          setEditRubricPoints(next)
                        }}
                      />
                      <Input
                        className="col-span-3"
                        type="number"
                        min={0}
                        placeholder="Weight"
                        value={String(kp.weight)}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const next = [...editRubricPoints]
                          next[idx] = { ...next[idx], weight: Number.isFinite(val) ? val : 1 }
                          setEditRubricPoints(next)
                        }}
                      />
                      <Button
                        variant="destructive"
                        className="col-span-1"
                        onClick={() => {
                          const next = [...editRubricPoints]
                          next.splice(idx, 1)
                          setEditRubricPoints(next)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setEditRubricPoints([...editRubricPoints, { point: "", weight: 1 }])}
                  >
                    Add Key Point
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

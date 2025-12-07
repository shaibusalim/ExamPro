"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StudentNav } from "@/components/student-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-client"
import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Question {
  id: string
  question: string
  type: "objective" | "fill_in_the_blanks" | "theory" | "practical"
  options?: string[]
  answer?: string
  diagram?: any
  marks?: number
}

interface Topic {
  id: string
  title: string
}

interface User {
  id: string
  classLevel: string
  fullName?: string
}

export default function StudentExamsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [generatedQuestions, setGeneratedQuestions] = useState<Question[] | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const initializedRef = useRef(false)
  const [selectedLevel, setSelectedLevel] = useState<string>("B7")
  const [selectedTopic, setSelectedTopic] = useState<string>("")
  const [responses, setResponses] = useState<Record<string, { selected?: string; written?: string }>>({})
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [score, setScore] = useState<{ total: number; correct: number } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [canvasState, setCanvasState] = useState<Record<string, { url?: string; drawing?: boolean }>>({})
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({})
  const [lockedExams, setLockedExams] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    if (initializedRef.current) return
    if (!authLoading) {
      const level = user && (user as unknown as User).classLevel ? (user as unknown as User).classLevel : "B7"
      setSelectedLevel(level)
      initializedRef.current = true
    }
  }, [user, authLoading])

  useEffect(() => {
    async function loadTopicsAndGenerate() {
      setPageLoading(true)
      try {
        const profRes = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
        })
        const prof = profRes.ok ? await profRes.json() : null
        if (prof?.lockedExams) {
          setLockedExams(true)
          setGeneratedQuestions([])
          setPageLoading(false)
          toast({ title: "Exams Locked", description: "Contact administrator for access." })
          return
        } else {
          setLockedExams(false)
        }
        const sessionRes = await fetch("/api/student/practice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: (user as any)?.id || "", classLevel: selectedLevel }),
        })
        if (sessionRes.ok) {
          const data = await sessionRes.json()
          const qs: Question[] = data.questions || []
          setGeneratedQuestions(qs)
          setScore(null)
          setResponses({})
          setFiles({})
          toast({ title: "Session Ready", description: `Total marks: ${data.totalMarks || 0}` })
        } else {
          setGeneratedQuestions([])
        }
      } catch {
        setGeneratedQuestions([])
      } finally {
        setPageLoading(false)
      }
    }
    loadTopicsAndGenerate()
  }, [selectedLevel])

  const selectOption = (qId: string, opt: string) => {
    setResponses((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), selected: opt } }))
  }

  const typeAnswer = (qId: string, text: string) => {
    setResponses((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), written: text } }))
  }

  const handleFile = (qId: string, f: File | null) => {
    setFiles((prev) => ({ ...prev, [qId]: f }))
  }

  const setCanvasRef = (qId: string, el: HTMLCanvasElement | null) => {
    canvasRefs.current[qId] = el
    if (el) {
      const ctx = el.getContext("2d")
      if (ctx) {
        ctx.lineWidth = 2
        ctx.lineCap = "round"
        ctx.strokeStyle = "#6366f1"
      }
    }
  }

  const startDraw = (qId: string, e: React.MouseEvent<HTMLCanvasElement>) => {
    setCanvasState((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), drawing: true } }))
    const el = canvasRefs.current[qId]
    const ctx = el?.getContext("2d")
    if (!el || !ctx) return
    const rect = el.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const moveDraw = (qId: string, e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = canvasState[qId]
    if (!st || !st.drawing) return
    const el = canvasRefs.current[qId]
    const ctx = el?.getContext("2d")
    if (!el || !ctx) return
    const rect = el.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const endDraw = (qId: string) => {
    setCanvasState((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), drawing: false } }))
  }

  const clearCanvas = (qId: string) => {
    const el = canvasRefs.current[qId]
    const ctx = el?.getContext("2d")
    if (!el || !ctx) return
    ctx.clearRect(0, 0, el.width, el.height)
  }

  const loadImage = async (qId: string) => {
    const el = canvasRefs.current[qId]
    const ctx = el?.getContext("2d")
    if (!el || !ctx) return
    const raw = canvasState[qId]?.url || ""
    if (!raw) {
      toast({ title: "Image URL required", description: "Paste a valid image URL." })
      return
    }
    const img = new Image()
    const proxied = `/api/image-proxy?url=${encodeURIComponent(raw)}`
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.clearRect(0, 0, el.width, el.height)
      const ratio = Math.min(el.width / img.width, el.height / img.height)
      const w = img.width * ratio
      const h = img.height * ratio
      const x = (el.width - w) / 2
      const y = (el.height - h) / 2
      ctx.drawImage(img, x, y, w, h)
    }
    img.onerror = () => {
      toast({ title: "Image load failed", description: "Trying proxy..." })
      img.src = proxied
    }
    try {
      const res = await fetch(raw, { mode: "cors", cache: "no-store" })
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      img.src = url
    } catch (e) {
      img.src = proxied
    }
  }

  const submitAnswers = () => {
    if (!generatedQuestions) return
    const objs = generatedQuestions.filter((q) => q.type === "objective")
    const total = objs.length
    const correct = objs.reduce((acc, q) => {
      const sel = responses[q.id]?.selected
      return acc + (sel && q.answer && sel === q.answer ? 1 : 0)
    }, 0)
    setScore({ total, correct })
    const totalMarks = (generatedQuestions || []).reduce((s, q) => s + (q.marks || (q.type === 'objective' ? 1 : 0)), 0)
    const scoredMarks = objs.reduce((s, q) => {
      const sel = responses[q.id]?.selected
      const ok = sel && q.answer && sel === q.answer
      const m = q.marks || 1
      return s + (ok ? m : 0)
    }, 0)
    const pass = totalMarks > 0 ? (scoredMarks / totalMarks) * 100 >= 50 : false
    const topicsList = topics.map((t) => t.title)
    fetch("/api/practice/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: {
          id: (user as any)?.id || null,
          fullName: (user as any)?.fullName || null,
          classLevel: (user as any)?.classLevel || null,
        },
        score: { total, correct },
        scoredMarks,
        totalMarks,
        pass,
        topics: topicsList,
        responses,
        questions: generatedQuestions,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        setAttemptId(d.attemptId || null)
        setShowResult(true)
      })
      .catch(() => {
        setAttemptId(null)
        setShowResult(true)
      })
  }

  const isPass = (score: { total: number; correct: number } | null) => {
    return score && score.total > 0 && (score.correct / score.total) * 100 >= 50
  }

  const passClass = (score: { total: number; correct: number } | null) => {
    const ok = isPass(score)
    return ok ? "text-green-600" : "text-red-600"
  }

  const badgeClass = (score: { total: number; correct: number } | null) => {
    const ok = isPass(score)
    return ok
      ? "bg-gradient-to-br from-green-100 to-green-50 text-green-700 border-2 border-green-300"
      : "bg-gradient-to-br from-red-100 to-red-50 text-red-700 border-2 border-red-300"
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground">Loading your exam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <StudentNav />
      <main className="flex-1 container mx-auto py-8 px-4 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                END OF TERM EXAMS
              </h1>
              <p className="text-muted-foreground">Challenge yourself and track your progress</p>
            </div>
            {generatedQuestions && (
              <div className="text-right bg-card border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold text-primary">{generatedQuestions.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Card */}
        <Card className="mb-6 border-primary/20 shadow-lg hover:shadow-xl transition-shadow animate-slide-up-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Exam Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Class Level</Label>
                <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v)}>
                  <SelectTrigger className="border-primary/30 focus:ring-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B7">Basic 7</SelectItem>
                    <SelectItem value="B8">Basic 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold">Current Topic</Label>
                <div className="px-3 py-2 rounded-md bg-accent/10 border border-accent/30 text-sm">
                  {selectedTopic || "Auto-selecting topic..."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        {generatedQuestions && generatedQuestions.length > 0 ? (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="animate-slide-up-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-foreground">Progress</p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(responses).length} / {generatedQuestions.length} answered
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300"
                  style={{ width: `${(Object.keys(responses).length / generatedQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="space-y-4 animate-slide-up-3">
              {generatedQuestions.map((q, index) => (
                <Card
                  key={q.id || `${q.type}-idx-${index}`}
                  className="border-primary/20 hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 pb-3 border-b border-primary/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <CardTitle className="text-base font-semibold">{q.question}</CardTitle>
                      </div>
                      {/* Question Type Badge */}
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
                        {q.type === "objective" && "MCQ"}
                        {q.type === "fill_in_the_blanks" && "Fill"}
                        {q.type === "theory" && "Essay"}
                        {q.type === "practical" && "Practical"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    {/* Diagram Section */}
                    {q.diagram && q.diagram.instruction && (
                      <div className="mb-4 p-3 bg-accent/5 border border-accent/20 rounded-lg">
                        <p className="text-sm font-medium mb-2">📐 Diagram: {q.diagram.instruction}</p>
                        <div className="grid md:grid-cols-3 gap-2 mb-2">
                          <input
                            type="text"
                            value={canvasState[q.id]?.url || ""}
                            onChange={(e) =>
                              setCanvasState((prev) => ({
                                ...prev,
                                [q.id]: { ...(prev[q.id] || {}), url: e.target.value },
                              }))
                            }
                            className="border border-primary/30 rounded px-2 py-1 text-sm md:col-span-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Paste image URL"
                          />
                          <Button
                            variant="outline"
                            onClick={() => loadImage(q.id)}
                            className="text-xs border-primary/30 hover:bg-primary/10"
                          >
                            Load Image
                          </Button>
                        </div>
                        <canvas
                          ref={(el) => setCanvasRef(q.id, el)}
                          width={600}
                          height={300}
                          className="w-full border border-primary/20 rounded bg-card hover:border-primary/40 transition-colors cursor-crosshair"
                          onMouseDown={(e) => startDraw(q.id, e)}
                          onMouseMove={(e) => moveDraw(q.id, e)}
                          onMouseUp={() => endDraw(q.id)}
                          onMouseLeave={() => endDraw(q.id)}
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => clearCanvas(q.id)}
                            className="text-xs border-primary/30 hover:bg-primary/10"
                          >
                            Clear Canvas
                          </Button>
                          <input
                            type="file"
                            onChange={(e) => handleFile(q.id, e.target.files?.[0] || null)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* Objective Questions */}
                    {q.type === "objective" && q.options && (
                      <div className="space-y-2">
                        {q.options.map((option, optIndex) => (
                          <Button
                            key={optIndex}
                            variant={responses[q.id]?.selected === option ? "default" : "outline"}
                            className={`w-full justify-start text-left px-4 py-3 h-auto whitespace-normal font-normal transition-all duration-200 ${
                              responses[q.id]?.selected === option
                                ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                                : "hover:border-primary/50 hover:bg-primary/5"
                            }`}
                            onClick={() => selectOption(q.id, option)}
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-current/20 mr-2 flex-shrink-0">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Fill in the Blanks / Theory / Practical */}
                    {(q.type === "fill_in_the_blanks" || q.type === "theory" || q.type === "practical") && (
                      <div className="space-y-2">
                        <Textarea
                          value={responses[q.id]?.written || ""}
                          onChange={(e) => typeAnswer(q.id, e.target.value)}
                          placeholder={
                            q.type === "fill_in_the_blanks"
                              ? "Fill in the blanks..."
                              : q.type === "theory"
                                ? "Write your answer..."
                                : "Describe your steps..."
                          }
                          className="min-h-24 border-primary/30 focus:ring-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          {responses[q.id]?.written?.length || 0} characters
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={submitAnswers}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold py-6 rounded-lg hover:shadow-lg transition-all duration-300 text-base"
              >
                Submit Exam
              </Button>
              {score && (
                <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <span className="text-sm font-medium text-accent">
                    MCQ Score: {score.correct}/{score.total}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center border-primary/20 bg-gradient-to-br from-card to-card/50 animate-slide-up-2">
            <div className="mb-4">
              <p className="text-4xl mb-2">📚</p>
            </div>
            <CardTitle className="mb-2 text-xl">
              {lockedExams ? "Exams Locked by Admin" : "No Questions Available"}
            </CardTitle>
            <p className="text-muted-foreground">
              {lockedExams
                ? "Contact administrator for access."
                : "We couldn't generate questions for you at this time. Please try again later."}
            </p>
          </Card>
        )}
      </main>

      {/* Results Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className={`text-2xl font-bold ${passClass(score)}`}>Exam Complete!</DialogTitle>
            <DialogDescription>Great effort, {(user as unknown as User)?.fullName || "Student"}!</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center space-y-4">
              {/* Score Circle */}
              <div className="flex justify-center">
                <div
                  className={`relative w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold ${badgeClass(score)}`}
                >
                  {score ? Math.round((score.correct / (score.total || 1)) * 100) : 0}%
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                <p className={`text-lg font-bold ${isPass(score) ? "text-green-600" : "text-red-600"}`}>
                  {isPass(score) ? "✓ Passed" : "✗ Failed"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You got {score?.correct}/{score?.total} questions correct
                </p>
              </div>

              {/* Attempt ID */}
              <div className="bg-muted/50 border border-border rounded px-3 py-2 text-xs">
                <p className="text-muted-foreground">Attempt ID: {attemptId || "N/A"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

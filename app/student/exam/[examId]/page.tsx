"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Question {
  id: string
  question_text: string
  question_type: "mcq" | "true_false" | "essay" | "fill_blank"
  marks: number
  option_text?: string
}

export default function ExamPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params.examId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const attemptIdRef = useRef("")
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [error, setError] = useState("")
  const [questionLocking, setQuestionLocking] = useState(false)
  const [unauthorized, setUnauthorized] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      setUnauthorized(true)
      router.push("/login")
      return
    }
    setUnauthorized(false)

    // Start exam
    fetch(`/api/student/exam/${examId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          try {
            const body = await res.json()
            setError(String(body?.error || "Exam not available"))
          } catch {
            setError("Exam not available")
          }
          setLoading(false)
          return
        }
        const data = await res.json()
        attemptIdRef.current = data.attemptId
        setQuestions(Array.isArray(data.questions) ? data.questions : [])
        const mins = typeof data.duration_minutes === 'number' ? data.duration_minutes : 60
        setTimeLeft(mins * 60)
        setQuestionLocking(!!data.questionLocking)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [examId, router])

  // Timer
  useEffect(() => {
    if (!loading && !error && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && !loading && !error) {
      handleSubmit()
    }

    return () => clearTimeout(timerRef.current)
  }, [timeLeft, loading, error])

  // Auto-save every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      // Auto-save logic would go here
    }, 10000)

    return () => clearInterval(saveInterval)
  }, [responses])

  // Proctoring: focus/tab switch and clipboard prevention
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const examEvent = async (type: string, details: any = {}) => {
      try {
        await fetch(`/api/student/exam/${examId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ attemptId: attemptIdRef.current, type, details }),
        })
      } catch {}
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        examEvent("tab_hidden")
      } else {
        examEvent("tab_visible")
      }
    }
    const handleBlur = () => examEvent("window_blur")
    const handleFocus = () => examEvent("window_focus")
    const blockContext = (e: MouseEvent) => {
      e.preventDefault()
      examEvent("contextmenu_blocked")
    }
    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault()
      const type = e.type === 'copy' ? 'copy_blocked' : e.type === 'paste' ? 'paste_blocked' : 'cut_blocked'
      examEvent(type)
    }
    const blockShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase()
        if (["c", "v", "x", "p", "a"].includes(k)) {
          e.preventDefault()
          examEvent(`shortcut_${k}_blocked`)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("contextmenu", blockContext)
    document.addEventListener("copy", blockClipboard)
    document.addEventListener("paste", blockClipboard)
    document.addEventListener("cut", blockClipboard)
    document.addEventListener("keydown", blockShortcuts)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("contextmenu", blockContext)
      document.removeEventListener("copy", blockClipboard)
      document.removeEventListener("paste", blockClipboard)
      document.removeEventListener("cut", blockClipboard)
      document.removeEventListener("keydown", blockShortcuts)
    }
  }, [])

  if (unauthorized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">{error}</h2>
          <Button onClick={() => router.push('/student/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="p-8 text-center space-y-4">
          <h2 className="text-xl font-semibold">No questions available for this exam</h2>
          <Button onClick={() => router.push('/student/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  async function handleSubmit() {
    setSubmitting(true)
    const token = localStorage.getItem("auth_token")

    try {
      const response = await fetch(`/api/student/exam/${examId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId: attemptIdRef.current,
          responses: Object.entries(responses).map(([questionId, response]) => ({
            questionId,
            ...response,
          })),
        }),
      })

      if (!response.ok) {
        try {
          const body = await response.json()
          alert(String(body?.error || "Failed to submit exam"))
        } catch {
          alert("Failed to submit exam")
        }
      } else {
        const data = await response.json()
        router.push(`/student/results/${examId}`)
      }
    } catch (error) {
      console.error(error)
      alert("Failed to submit exam")
    } finally {
      setSubmitting(false)
    }
  }

  function updateResponse(value: any) {
    setResponses({
      ...responses,
      [question.id]: value,
    })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header with timer */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-card border border-border rounded-lg p-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Exam In Progress</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          <div className="text-3xl font-bold text-primary">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-6">
        {/* Question */}
        <div className="md:col-span-3">
          <Card className="p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">{String((question as any).question_text || (question as any).question || "")}</h2>
              <span className="text-sm text-muted-foreground">{question.marks} mark(s)</span>
            </div>

            {/* Question Options */}
            <div className="space-y-4">
              {question.question_type === "mcq" && (
                <RadioGroup
                  value={responses[question.id]?.selectedOptionId || ""}
                  onValueChange={(value) => updateResponse({ selectedOptionId: value })}
                >
                  {Array.isArray((question as any).options) && (question as any).options.length > 0 ? (
                    (question as any).options.map((opt: any) => (
                      <label key={String(opt.id)} className="flex items-center gap-2 p-2 border rounded">
                        <input
                          type="radio"
                          value={String(opt.id)}
                          checked={responses[question.id]?.selectedOptionId === String(opt.id)}
                          onChange={(e) => updateResponse({ selectedOptionId: e.target.value })}
                        />
                        <span>{opt.text || opt.option || opt.label || String(opt)}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No options available.</p>
                  )}
                </RadioGroup>
              )}

              {question.question_type === "essay" && (
                <Textarea
                  placeholder="Your answer here..."
                  value={responses[question.id]?.textResponse || ""}
                  onChange={(e) => updateResponse({ textResponse: e.target.value })}
                  className="min-h-32"
                />
              )}
              {question.question_type === "true_false" && (
                <div className="flex gap-4">
                  {shouldSwapTF(attemptIdRef.current, question.id) ? (
                    <>
                      <Button
                        variant={responses[question.id]?.selectedOptionId === 'false' ? 'default' : 'outline'}
                        onClick={() => updateResponse({ selectedOptionId: 'false', selectedOptionText: 'false' })}
                      >
                        False
                      </Button>
                      <Button
                        variant={responses[question.id]?.selectedOptionId === 'true' ? 'default' : 'outline'}
                        onClick={() => updateResponse({ selectedOptionId: 'true', selectedOptionText: 'true' })}
                      >
                        True
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={responses[question.id]?.selectedOptionId === 'true' ? 'default' : 'outline'}
                        onClick={() => updateResponse({ selectedOptionId: 'true', selectedOptionText: 'true' })}
                      >
                        True
                      </Button>
                      <Button
                        variant={responses[question.id]?.selectedOptionId === 'false' ? 'default' : 'outline'}
                        onClick={() => updateResponse({ selectedOptionId: 'false', selectedOptionText: 'false' })}
                      >
                        False
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0 || questionLocking}
              >
                Previous
              </Button>

              {currentQuestion === questions.length - 1 ? (
                <Button onClick={() => setShowSubmitDialog(true)} className="bg-green-600 hover:bg-green-700">
                  Submit Exam
                </Button>
              ) : (
                <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next</Button>
              )}
            </div>
          </Card>
        </div>

        {/* Question Navigator */}
        <div className="md:col-span-1">
          <Card className="p-4 space-y-2 sticky top-4">
            <h3 className="font-semibold text-sm">Questions</h3>
            <div className="grid grid-cols-3 gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (questionLocking && idx < currentQuestion) return
                    setCurrentQuestion(idx)
                  }}
                  className={`aspect-square rounded text-sm font-semibold transition-colors ${
                    idx === currentQuestion
                      ? "bg-primary text-primary-foreground"
                      : responses[questions[idx].id]
                        ? "bg-green-100 text-green-900"
                        : "bg-muted"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to submit? You won't be able to change your answers.
          </AlertDialogDescription>
          <div className="flex gap-4 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? "Submitting..." : "Submit"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
  function seedFromString(s: string) {
    return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  }
  function shouldSwapTF(attemptId: string, qid: string) {
    const seed = seedFromString(String(attemptId || '') + String(qid || ''))
    return seed % 2 === 1
  }

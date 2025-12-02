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
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    // Start exam
    fetch(`/api/student/exam/${examId}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        attemptIdRef.current = data.attemptId
        setQuestions(data.questions)
        setTimeLeft(data.questions[0]?.duration_minutes * 60 || 60 * 60)
        setLoading(false)
      })
      .catch((err) => console.error(err))
  }, [examId, router])

  // Timer
  useEffect(() => {
    if (!loading && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && !loading) {
      handleSubmit()
    }

    return () => clearTimeout(timerRef.current)
  }, [timeLeft, loading])

  // Auto-save every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      // Auto-save logic would go here
    }, 10000)

    return () => clearInterval(saveInterval)
  }, [responses])

  // Tab switching warning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.warn("Tab switch detected")
        // Log this event in the backend
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
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

      const data = await response.json()
      router.push(`/student/results/${examId}`)
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
              <h2 className="text-2xl font-semibold mb-4">{question.question_text}</h2>
              <span className="text-sm text-muted-foreground">{question.marks} mark(s)</span>
            </div>

            {/* Question Options */}
            <div className="space-y-4">
              {question.question_type === "mcq" && (
                <RadioGroup
                  value={responses[question.id]?.selectedOptionId || ""}
                  onValueChange={(value) => updateResponse({ selectedOptionId: value })}
                >
                  {/* Options would be populated here */}
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
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
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
                  onClick={() => setCurrentQuestion(idx)}
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

"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Question {
  id: string
  question: string
  type: "objective" | "fill_in_the_blanks" | "theory" | "practical"
  options?: string[]
  answer?: string
  marks?: number
}

export default function DemoExamsPage() {
  const { toast } = useToast()
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[] | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<string>("B7")
  const [responses, setResponses] = useState<Record<string, { selected?: string; written?: string }>>({})
  const [score, setScore] = useState<{ total: number; correct: number } | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    async function loadDemo() {
      setPageLoading(true)
      try {
        const sessionRes = await fetch("/api/student/practice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "", classLevel: selectedLevel }),
        })
        if (sessionRes.ok) {
          const data = await sessionRes.json()
          const qs: Question[] = data.questions || []
          setGeneratedQuestions(qs)
          setScore(null)
          setResponses({})
          toast({ title: "Demo Ready", description: `Total marks: ${data.totalMarks || 0}` })
        } else {
          setGeneratedQuestions([])
        }
      } catch {
        setGeneratedQuestions([])
      } finally {
        setPageLoading(false)
      }
    }
    loadDemo()
  }, [selectedLevel])

  const selectOption = (qId: string, opt: string) => {
    setResponses((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), selected: opt } }))
  }

  const typeAnswer = (qId: string, text: string) => {
    setResponses((prev) => ({ ...prev, [qId]: { ...(prev[qId] || {}), written: text } }))
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
    setShowResult(true)
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

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-muted-foreground">Loading demo exam...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <main className="flex-1 container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                DEMO PRACTICE
              </h1>
              <p className="text-muted-foreground">Try a short demo. Full dashboard requires login.</p>
            </div>
            {generatedQuestions && (
              <div className="text-right bg-card border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="text-2xl font-bold text-primary">{generatedQuestions.length}</p>
              </div>
            )}
          </div>
        </div>

        <Card className="mb-6 border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
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
                <div className="px-3 py-2 rounded-md bg-accent/10 border border-accent/30 text-sm">Demo curated questions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {generatedQuestions && generatedQuestions.length > 0 ? (
          <div className="space-y-6">
            <div>
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

            <div className="space-y-4">
              {generatedQuestions.map((q, index) => (
                <Card key={q.id || `${q.type}-idx-${index}`} className="border-primary/20 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 pb-3 border-b border-primary/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <CardTitle className="text-base font-semibold">{q.question}</CardTitle>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
                        {q.type === "objective" && "MCQ"}
                        {q.type === "fill_in_the_blanks" && "Fill"}
                        {q.type === "theory" && "Essay"}
                        {q.type === "practical" && "Practical"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
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
                        <p className="text-xs text-muted-foreground">{responses[q.id]?.written?.length || 0} characters</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={submitAnswers}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold py-6 rounded-lg hover:shadow-lg transition-all duration-300 text-base"
              >
                Submit Exam
              </Button>
              {score && (
                <div className="flex items-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <span className="text-sm font-medium text-accent">MCQ Score: {score.correct}/{score.total}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center border-primary/20 bg-gradient-to-br from-card to-card/50">
            <div className="mb-4">
              <p className="text-4xl mb-2">📚</p>
            </div>
            <CardTitle className="mb-2 text-xl">No Questions Available</CardTitle>
            <p className="text-muted-foreground">We couldn't load the demo at this time. Please try again later.</p>
          </Card>
        )}
      </main>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className={`text-2xl font-bold ${passClass(score)}`}>Exam Complete!</DialogTitle>
            <DialogDescription>Great effort, Visitor!</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold ${badgeClass(score)}`}>
                  {score ? Math.round((score.correct / (score.total || 1)) * 100) : 0}%
                </div>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${isPass(score) ? "text-green-600" : "text-red-600"}`}>{isPass(score) ? "✓ Passed" : "✗ Failed"}</p>
                <p className="text-sm text-muted-foreground mt-1">You got {score?.correct}/{score?.total} questions correct</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

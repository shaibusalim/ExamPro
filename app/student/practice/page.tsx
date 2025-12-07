"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { StudentNav } from "@/components/student-nav"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, BookOpen, TrendingUp } from "lucide-react"

interface Topic {
  id: string
  title: string
  description: string
  learning_outcomes: string
  class_level: string
  weekNumber: number
}

interface UserProfile {
  fullName: string
  classLevel?: string
  studentId?: string
}

interface Question {
  id: string
  questionText: string
  questionType: "mcq" | "true_false" | "fill_blank" | "essay"
  marks: number
  options: Array<{ text: string; isCorrect: boolean }>
  correctAnswer?: string
  explanation?: string
}

interface PracticeState {
  topic: Topic
  questions: Question[]
  currentIndex: number
  selectedAnswers: Record<string, string>
  submitted: boolean
}

export default function PracticePage() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [practice, setPractice] = useState<PracticeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [userClassLevel, setUserClassLevel] = useState<string>("")

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    const fetchPracticeData = async () => {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${token}` }

        const profileRes = await fetch("/api/profile", { headers })
        if (profileRes.ok) {
          const profileData: UserProfile = await profileRes.json()
          setUserClassLevel(profileData.classLevel || "")
        } else {
          setUserClassLevel("B7")
        }

        const levelToFetch = userClassLevel || "B7"
        const topicsRes = await fetch(`/api/topics?level=${levelToFetch}`, { headers })
        if (!topicsRes.ok) {
          setTopics([])
        } else {
          const data = await topicsRes.json()
          if (Array.isArray(data)) {
            const sortedTopics = (data as Topic[]).sort((a, b) => {
              const weekA =
                a.weekNumber !== undefined && a.weekNumber !== null ? a.weekNumber : Number.POSITIVE_INFINITY
              const weekB =
                b.weekNumber !== undefined && b.weekNumber !== null ? b.weekNumber : Number.POSITIVE_INFINITY
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
      } catch (err) {
        console.error("[PracticePage] Error during data fetching:", err)
        setTopics([])
      } finally {
        setLoading(false)
      }
    }

    fetchPracticeData()
  }, [router, userClassLevel])

  async function startPractice(topic: Topic) {
    setLoading(true)
    try {
      const generateQuestionsRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          topicTitle: topic.title,
          classLevel: topic.class_level,
          numberOfQuestions: 5,
          questionType: "mcq",
        }),
      })

      if (!generateQuestionsRes.ok) {
        return
      }

      const { generatedQuestions } = await generateQuestionsRes.json()

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        return
      }

      const formattedQuestions: Question[] = generatedQuestions.map((q: any) => ({
        id: q.id || Math.random().toString(36).substr(2, 9),
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks || 1,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }))

      setPractice({
        topic,
        questions: formattedQuestions,
        currentIndex: 0,
        selectedAnswers: {},
        submitted: false,
      })
    } catch (err) {
      console.error("Error during AI question generation:", err)
    } finally {
      setLoading(false)
    }
  }

  if (!practice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <StudentNav />

        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-12 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold text-balance">Practice Questions</h1>
            </div>
            <p className="text-muted-foreground mt-2 text-lg">
              Strengthen your understanding with interactive practice
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {topics.map((topic, index) => (
                  <Card
                    key={topic.id}
                    className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border border-border/50 hover:border-primary/30 animate-slide-up-1 hover:scale-105 hover:translate-y-[-4px]"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                          {topic.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{topic.description}</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ml-3">
                        <TrendingUp className="w-4 h-4 text-accent" />
                      </div>
                    </div>

                    {topic.learning_outcomes && (
                      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/30">
                        <p className="text-xs font-medium text-muted-foreground">Learning Outcomes</p>
                        <p className="text-sm text-foreground line-clamp-2 mt-1">{topic.learning_outcomes}</p>
                      </div>
                    )}

                    <Button
                      onClick={() => startPractice(topic)}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-300 group/btn"
                    >
                      <span className="group-hover/btn:translate-x-1 transition-transform">Start Practice</span>
                    </Button>
                  </Card>
                ))}
              </div>

              {topics.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No practice topics available yet</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    )
  }

  const question = practice.questions[practice.currentIndex]
  const allAnswered = Object.keys(practice.selectedAnswers).length === practice.questions.length
  const score = Object.entries(practice.selectedAnswers).filter(([qId, aId]) => {
    const q = practice.questions.find((q) => q.id === qId)
    if (q?.questionType === "mcq" || q?.questionType === "true_false") {
      const selectedOption = q.options?.find((o) => o.text === aId)
      return selectedOption?.isCorrect
    }
    return false
  }).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <StudentNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {!practice.submitted ? (
          <>
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1 text-balance">{practice.topic.title}</h1>
                  <p className="text-muted-foreground">
                    Question {practice.currentIndex + 1} of {practice.questions.length}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {Math.round(((practice.currentIndex + 1) / practice.questions.length) * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Complete</p>
                </div>
              </div>

              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{
                    width: `${((practice.currentIndex + 1) / practice.questions.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <Card className="p-8 space-y-6 mb-6 border border-border/50 shadow-lg hover:shadow-xl transition-shadow animate-slide-up-1">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary font-medium">
                  {question.questionType === "mcq"
                    ? "Multiple Choice"
                    : question.questionType === "true_false"
                      ? "True/False"
                      : "Short Answer"}
                </div>
                <h2 className="text-xl font-semibold leading-relaxed text-foreground">{question.questionText}</h2>
              </div>

              {question.questionType === "mcq" || question.questionType === "true_false" ? (
                <RadioGroup
                  value={practice.selectedAnswers[question.id] || ""}
                  onValueChange={(value) => {
                    setPractice({
                      ...practice,
                      selectedAnswers: {
                        ...practice.selectedAnswers,
                        [question.id]: value,
                      },
                    })
                  }}
                >
                  <div className="space-y-3 mt-6">
                    {question.options?.map((option, idx) => (
                      <div
                        key={option.text}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          practice.selectedAnswers[question.id] === option.text
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <RadioGroupItem value={option.text} id={option.text} />
                        <Label htmlFor={option.text} className="cursor-pointer flex-1 font-medium">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : question.questionType === "fill_blank" || question.questionType === "essay" ? (
                <Textarea
                  placeholder="Your answer here..."
                  value={practice.selectedAnswers[question.id] || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPractice({
                      ...practice,
                      selectedAnswers: {
                        ...practice.selectedAnswers,
                        [question.id]: e.target.value,
                      },
                    })
                  }
                  rows={4}
                  className="mt-6 border-2 focus:border-primary"
                />
              ) : (
                <p className="text-muted-foreground">Unsupported question type.</p>
              )}

              <div className="flex justify-between gap-4 pt-6 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => setPractice({ ...practice, currentIndex: Math.max(0, practice.currentIndex - 1) })}
                  disabled={practice.currentIndex === 0}
                  className="flex-1 hover:bg-muted/50"
                >
                  ← Previous
                </Button>

                {practice.currentIndex === practice.questions.length - 1 ? (
                  <Button
                    onClick={() => setPractice({ ...practice, submitted: true })}
                    disabled={!allAnswered}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    Submit Practice
                  </Button>
                ) : (
                  <Button
                    onClick={() => setPractice({ ...practice, currentIndex: practice.currentIndex + 1 })}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground font-semibold"
                  >
                    Next →
                  </Button>
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center space-y-8 border border-border/50 shadow-xl animate-slide-up-1">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Practice Complete!</h2>
              <p className="text-muted-foreground text-lg">Great job finishing all the questions</p>
            </div>

            <div className="space-y-3">
              <div className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {Math.round((score / practice.questions.length) * 100)}%
              </div>
              <p className="text-lg text-muted-foreground">
                You got <span className="font-bold text-foreground">{score}</span> out of{" "}
                <span className="font-bold text-foreground">{practice.questions.length}</span> correct
              </p>

              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-sm font-medium text-muted-foreground mb-2">Performance</p>
                <p className="text-foreground">
                  {score / practice.questions.length >= 0.8
                    ? "Excellent work! You have a strong grasp of this topic."
                    : score / practice.questions.length >= 0.6
                      ? "Good effort! Review the missed questions to improve."
                      : "Keep practicing! This topic needs more review."}
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={() => setPractice(null)} variant="outline" className="flex-1 hover:bg-muted/50">
                Back to Topics
              </Button>
              <Button
                onClick={() => {
                  router.push("/dashboard")
                }}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground font-semibold"
              >
                Go to Dashboard
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

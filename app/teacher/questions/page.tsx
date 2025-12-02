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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge" // Import Badge component
import { TeacherNav } from "@/components/teacher-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Topic {
  id: string
  title: string
  class_level: string
  weekNumber: number; // Added weekNumber
  description: string; // Added description
}

interface Question {
  id: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'essay';
  marks: number;
  correctAnswer?: string; // For MCQs, True/False
  explanation?: string;
  options?: Array<{ text: string; isCorrect: boolean }>; // For MCQs, True/False
  topicId?: string;
}

export default function QuestionsPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [questions, setQuestions] = useState<Question[]>([]) // Use Question interface
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    topicId: "",
    questionText: "",
    questionType: "mcq",
    marks: 1,
    correctAnswer: "",
    explanation: "",
    options: ["", "", "", ""],
  })

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    if (!savedToken) {
      router.push("/login")
      return
    }

    setToken(savedToken)

    Promise.all([
      fetch("/api/topics", {
        headers: { Authorization: `Bearer ${savedToken}` },
      }),
      fetch("/api/questions", {
        headers: { Authorization: `Bearer ${savedToken}` },
      }),
    ])
      .then(async ([topicsRes, questionsRes]) => {
        // Handle topics response
        if (!topicsRes.ok) {
          console.error("Failed to fetch topics. Status:", topicsRes.status, topicsRes.statusText);
          setTopics([]); // Ensure topics is an array even on error
        } else {
          const topicsData = await topicsRes.json();
          if (Array.isArray(topicsData)) {
            // Sort topics client-side by weekNumber and then by title
            const sortedTopics = (topicsData as Topic[]).sort((a, b) => {
              const weekA = a.weekNumber !== undefined && a.weekNumber !== null ? a.weekNumber : Infinity;
              const weekB = b.weekNumber !== undefined && b.weekNumber !== null ? b.weekNumber : Infinity;

              if (weekA === weekB) {
                return a.title.localeCompare(b.title);
              }
              return weekA - weekB;
            });
            setTopics(sortedTopics);
          } else {
            console.error("Failed to fetch topics: Data is not an array.", topicsData);
            setTopics([]);
          }
        }

        // Handle questions response
        if (!questionsRes.ok) {
          console.error("Failed to fetch questions. Status:", questionsRes.status, questionsRes.statusText);
          setQuestions([]); // Ensure questions is an array even on error
        } else {
          const questionsData = await questionsRes.json();
          if (Array.isArray(questionsData)) {
            setQuestions(questionsData);
          } else {
            console.error("Failed to fetch questions: Data is not an array.", questionsData);
            setQuestions([]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error during data fetching in QuestionsPage:", err);
        setError("Failed to load data");
        setTopics([]); // Ensure topics is an array on fetch error
        setQuestions([]); // Ensure questions is an array on fetch error
        setLoading(false);
      })
  }, [router])

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.topicId || !formData.questionText) {
      setError("Please fill all required fields")
      return
    }

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          options:
            formData.questionType === "mcq" || formData.questionType === "true_false"
              ? formData.options.map((text, idx) => ({
                  text,
                  isCorrect: text === formData.correctAnswer,
                }))
              : [],
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to create question")
        return
      }

      setSuccess("Question created successfully!")
      setFormData({
        topicId: "",
        questionText: "",
        questionType: "mcq",
        marks: 1,
        correctAnswer: "",
        explanation: "",
        options: ["", "", "", ""],
      })
    } catch (err) {
      setError("An error occurred. Please try again.")
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
          <h1 className="text-4xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-2">Create and manage exam questions</p>
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

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Create Question</TabsTrigger>
            <TabsTrigger value="browse">Browse Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <form onSubmit={handleCreateQuestion} className="space-y-6">
              <Card className="p-6 space-y-6">
                <h2 className="text-xl font-semibold">Question Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Select
                    value={formData.topicId}
                    onValueChange={(value) => setFormData({ ...formData, topicId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.title} ({topic.class_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionType">Question Type *</Label>
                  <Select
                    value={formData.questionType}
                    onValueChange={(value) => setFormData({ ...formData, questionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionText">Question Text *</Label>
                  <Textarea
                    id="questionText"
                    placeholder="Enter the question"
                    value={formData.questionText}
                    onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marks">Marks</Label>
                    <Input
                      id="marks"
                      type="number"
                      value={formData.marks === 0 ? "" : formData.marks}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setFormData({ ...formData, marks: isNaN(value) ? 0 : value });
                      }}
                    />
                  </div>

                  {(formData.questionType === "mcq" || formData.questionType === "true_false") && (
                    <div className="space-y-2">
                      <Label htmlFor="correctAnswer">Correct Answer *</Label>
                      <Select
                        value={formData.correctAnswer}
                        onValueChange={(value) => setFormData({ ...formData, correctAnswer: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
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
                    <Label>Options</Label>
                    {formData.options.map((option, idx) => (
                      <Input
                        key={idx}
                        placeholder={`Option ${idx + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options]
                          newOptions[idx] = e.target.value
                          setFormData({ ...formData, options: newOptions })
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="explanation">Explanation</Label>
                  <Textarea
                    id="explanation"
                    placeholder="Explain the correct answer"
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    rows={2}
                  />
                </div>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Create Question
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <h2 className="text-2xl font-bold">All Questions</h2>
            {questions.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No questions available. Create questions or use AI to generate some!</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {questions.map((question) => (
                  <Card key={question.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{question.questionText}</h3>
                      <div className="flex gap-2">
                        <Badge variant="outline">{question.questionType.replace('_', ' ').toUpperCase()}</Badge>
                        <Badge variant="secondary">{question.marks} mark(s)</Badge>
                      </div>
                      {question.questionType === 'mcq' || question.questionType === 'true_false' ? (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Options:
                          <ul className="list-disc pl-5">
                            {question.options?.map((option, idx) => (
                              <li key={idx}>
                                {option.text} {option.isCorrect && '(Correct)'}
                              </li>
                            ))}
                          </ul>
                          {question.correctAnswer && <p>Correct Answer: {question.correctAnswer}</p>}
                        </div>
                      ) : (
                        question.correctAnswer && <p className="mt-2 text-sm text-muted-foreground">Correct Answer: {question.correctAnswer}</p>
                      )}
                      {question.explanation && <p className="mt-2 text-sm text-muted-foreground">Explanation: {question.explanation}</p>}
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

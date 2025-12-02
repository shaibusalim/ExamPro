"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { StudentNav } from "@/components/student-nav"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea" // Import Textarea

interface Topic {
  id: string
  title: string
  description: string
  learning_outcomes: string
  class_level: string
  weekNumber: number; // Added weekNumber
}

interface UserProfile {
  fullName: string
  classLevel?: string
  studentId?: string // This can be the "code"
}

interface Question {
  id: string
  questionText: string // Changed from question_text
  questionType: 'mcq' | 'true_false' | 'fill_blank' | 'essay'; // Changed from question_type, added literal types
  marks: number
  options: Array<{ text: string; isCorrect: boolean }> // Removed 'id' from option since Gemini might not provide
  correctAnswer?: string // For MCQs, True/False
  explanation?: string
}

interface PracticeState {
  topic: Topic // Topic will always be present once practice is set
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
  const [userClassLevel, setUserClassLevel] = useState<string>(""); // New state for user's class level

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    const fetchPracticeData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch user profile to get classLevel
        const profileRes = await fetch("/api/profile", { headers });
        if (profileRes.ok) {
          const profileData: UserProfile = await profileRes.json();
          setUserClassLevel(profileData.classLevel || ""); // Set the user's class level
          console.log("[PracticePage] User profile fetched:", profileData); // Debugging
        } else {
          console.error("[PracticePage] Failed to fetch user profile:", profileRes.status, profileRes.statusText);
          setUserClassLevel("B7"); // Default to B7 if profile fetch fails
        }

        // 2. Fetch topics, using the user's class level if available, otherwise default
        const levelToFetch = userClassLevel || "B7"; // Use fetched level or default
        console.log(`[PracticePage] Fetching topics for class level: ${levelToFetch}`); // Debugging

        const topicsRes = await fetch(`/api/topics?level=${levelToFetch}`, { headers });
        if (!topicsRes.ok) {
          console.error("[PracticePage] Failed to fetch topics. Status:", topicsRes.status, topicsRes.statusText);
          setTopics([]);
        } else {
          const data = await topicsRes.json();
          if (Array.isArray(data)) {
            const sortedTopics = (data as Topic[]).sort((a, b) => {
              const weekA = a.weekNumber !== undefined && a.weekNumber !== null ? a.weekNumber : Infinity;
              const weekB = b.weekNumber !== undefined && b.weekNumber !== null ? b.weekNumber : Infinity;

              if (weekA === weekB) {
                return a.title.localeCompare(b.title);
              }
              return weekA - weekB;
            });
            setTopics(sortedTopics);
            console.log("[PracticePage] Fetched topics:", sortedTopics); // Debugging
          } else {
            console.error("[PracticePage] Failed to fetch topics: Data is not an array.", data);
            setTopics([]);
          }
        }
      } catch (err) {
        console.error("[PracticePage] Error during data fetching in PracticePage:", err);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeData();
  }, [router, userClassLevel]); // userClassLevel as dependency

  async function startPractice(topic: Topic) {
    console.log("[PracticePage] Starting practice for topic:", topic); // Debugging
    setLoading(true);
    try {
      // Use AI to generate questions for the selected topic
      console.log("[PracticePage] Sending to /api/generate-questions:", {
        topicTitle: topic.title,
        classLevel: topic.class_level,
        numberOfQuestions: 5,
        questionType: "mcq",
      }); // Debugging
      const generateQuestionsRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          topicTitle: topic.title,
          classLevel: topic.class_level,
          numberOfQuestions: 5, // Default number of questions
          questionType: "mcq", // Default question type (e.g., 'mcq', 'true_false', 'short_answer')
        }),
      });

      if (!generateQuestionsRes.ok) {
        console.error("Failed to generate AI questions. Status:", generateQuestionsRes.status, generateQuestionsRes.statusText);
        // Set an error message for the user if AI generation fails
        // setError("Failed to generate questions. Please try again."); // Need to add error state
        return; // Exit if AI generation failed
      }

      const { generatedQuestions } = await generateQuestionsRes.json();
      console.log("[PracticePage] Generated questions:", generatedQuestions); // Debugging

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        console.warn("AI generated no questions for this topic:", topic.title);
        // Set a message for the user if no questions were generated
        // setError("No questions generated by AI for this topic. Please try another."); // Need to add error state
        return;
      }

      // Format generated questions to match existing Question interface
      const formattedQuestions: Question[] = generatedQuestions.map((q: any) => ({
        id: q.id || Math.random().toString(36).substr(2, 9), // Assign a temporary ID if not provided by AI
        questionText: q.questionText,
        questionType: q.questionType,
        marks: q.marks || 1,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      setPractice({
        topic,
        questions: formattedQuestions,
        currentIndex: 0,
        selectedAnswers: {},
        submitted: false,
      });
    } catch (err) {
      console.error("Error during AI question generation for practice:", err);
      // setError("An unexpected error occurred during question generation."); // Need to add error state
    } finally {
      setLoading(false);
    }
  }

  if (!practice) {
    return (
      <div className="min-h-screen bg-background">
        <StudentNav />

        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold">Practice Questions</h1>
            <p className="text-muted-foreground mt-2">Improve your skills with practice questions</p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {topics.map((topic) => (
                <Card key={topic.id} className="p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold mb-2">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{topic.description}</p>
                  <Button onClick={() => startPractice(topic)} className="w-full">
                    Start Practice
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  const question = practice.questions[practice.currentIndex];
  const allAnswered = Object.keys(practice.selectedAnswers).length === practice.questions.length;
  const score = Object.entries(practice.selectedAnswers).filter(([qId, aId]) => {
    const q = practice.questions.find((q) => q.id === qId);
    // For MCQs/True-False, check if the selected option's text matches the correct answer or isCorrect flag
    if (q?.questionType === 'mcq' || q?.questionType === 'true_false') {
      const selectedOption = q.options?.find((o) => o.text === aId); // Assuming aId is the option text for display, or option.id
      return selectedOption?.isCorrect;
    }
    // For other types like 'fill_blank' or 'essay', score checking is more complex and might involve AI or manual grading.
    // For now, these types won't contribute to 'score' unless explicitly handled.
    return false;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <StudentNav />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {!practice.submitted ? (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{practice.topic.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {practice.currentIndex + 1} of {practice.questions.length}
              </p>
            </div>

            <Card className="p-8 space-y-6 mb-6">
              <h2 className="text-xl font-semibold">{question.questionText}</h2> {/* Changed to questionText */}

              {/* Render question types dynamically */}
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
                    });
                  }}
                >
                  <div className="space-y-3">
                    {question.options?.map((option) => ( // Use optional chaining for options
                      <div key={option.text} className="flex items-center space-x-2"> {/* Key by text or generate id */}
                        <RadioGroupItem value={option.text} id={option.text} />
                        <Label htmlFor={option.text} className="cursor-pointer">
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => // Explicitly type event
                    setPractice({
                      ...practice,
                      selectedAnswers: {
                        ...practice.selectedAnswers,
                        [question.id]: e.target.value,
                      },
                    })
                  }
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground">Unsupported question type.</p>
              )}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPractice({ ...practice, currentIndex: Math.max(0, practice.currentIndex - 1) })}
                  disabled={practice.currentIndex === 0}
                >
                  Previous
                </Button>

                {practice.currentIndex === practice.questions.length - 1 ? (
                  <Button
                    onClick={() => setPractice({ ...practice, submitted: true })}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!allAnswered}
                  >
                    Submit Practice
                  </Button>
                ) : (
                  <Button onClick={() => setPractice({ ...practice, currentIndex: practice.currentIndex + 1 })}>
                    Next
                  </Button>
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold">Practice Complete!</h2>
            <div className="text-5xl font-bold text-primary">
              {Math.round((score / practice.questions.length) * 100)}%
            </div>
            <p className="text-lg">
              You got {score} out of {practice.questions.length} correct
            </p>
            <Button onClick={() => setPractice(null)}>Back to Topics</Button>
          </Card>
        )}
      </main>
    </div>
  )
}

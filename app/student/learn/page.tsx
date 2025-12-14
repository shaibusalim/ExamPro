"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StudentNav } from "@/components/student-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { BookOpen, TrendingUp } from "lucide-react"
import { useAuth } from "@/lib/auth-client"
// Removed direct Firestore counts to avoid permission issues. Counts now fetched via API.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Topic {
  id: string
  title: string
  classLevel: "B7" | "B8"
  weekNumber?: number | null
}

interface StudentProfile {
  fullName: string
  classLevel?: "B7" | "B8"
  lockedDashboard?: boolean
}

export default function LearnPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [lessonStats, setLessonStats] = useState<Record<string, { count: number }>>({})
  const [openTopicId, setOpenTopicId] = useState<string | null>(null)
  const [openTopicTitle, setOpenTopicTitle] = useState<string>("")
  const [topicLessons, setTopicLessons] = useState<any[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null)
  const [unsubscribeTopic, setUnsubscribeTopic] = useState<null | (() => void)>(null)
  const [lessonQuery, setLessonQuery] = useState("")
  const [sortMode, setSortMode] = useState<"updated" | "title">("updated")
  const [activeTab, setActiveTab] = useState<"content" | "media">("content")
  const [attachmentViewer, setAttachmentViewer] = useState<{ url: string; type: "image" | "video"; name?: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      setLoading(false)
      return
    }
    setChecked(true)

    async function load() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const profileRes = await fetch("/api/profile", { headers })
        let classLevel: "B7" | "B8" | undefined = undefined
        if (profileRes.ok) {
          const p = await profileRes.json()
          setProfile(p)
          classLevel = (p?.classLevel as "B7" | "B8") || undefined
        }
        const topicsUrl = classLevel ? `/api/topics?classLevel=${classLevel}` : "/api/topics"
        const topicsRes = await fetch(topicsUrl, { headers })
        const data = topicsRes.ok ? await topicsRes.json() : []
        setTopics(Array.isArray(data) ? data : [])
      } catch {
        setTopics([])
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      if (!user || user.role !== "student") {
        router.push("/login")
        setLoading(false)
        return
      }
      load()
    }
  }, [router, authLoading, user])

  useEffect(() => {
    async function loadCounts() {
      if (!profile?.classLevel) return
      try {
        const token = localStorage.getItem("auth_token") || ""
        const headers = { Authorization: `Bearer ${token}` }
        const res = await fetch(`/api/student/lessons?classLevel=${profile.classLevel}`, { headers })
        const items = res.ok ? await res.json() : []
        const stats: Record<string, { count: number }> = {}
        if (Array.isArray(items)) {
          items.forEach((l: any) => {
            const key = l.topicId || "__NONE__"
            stats[key] = { count: (stats[key]?.count || 0) + 1 }
          })
        }
        setLessonStats(stats)
      } catch {
        setLessonStats({})
      }
    }
    loadCounts()
  }, [profile?.classLevel])

  function openLessonsForTopic(topicId: string, title: string) {
    if (!profile?.classLevel) return
    setOpenTopicId(topicId)
    setOpenTopicTitle(title)
    setLessonsLoading(true)
    if (unsubscribeTopic) {
      try { unsubscribeTopic() } catch {}
      setUnsubscribeTopic(null)
    }
    const q = query(
      collection(db, "lessons"),
      where("classLevel", "==", profile.classLevel),
      where("isPublished", "==", true),
      where("topicId", "==", topicId),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: any[] = []
        snap.forEach((doc) => {
          const data = doc.data() as any
          items.push({ id: doc.id, ...data })
        })
        items.sort((a, b) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime())
        setTopicLessons(items)
        setLessonsLoading(false)
        setSelectedLessonIndex(items.length > 0 ? 0 : null)
      },
      () => {
        setTopicLessons([])
        setLessonsLoading(false)
        setSelectedLessonIndex(null)
      }
    )
    setUnsubscribeTopic(() => unsub)
  }

  function closeLessonsDialog() {
    setOpenTopicId(null)
    setOpenTopicTitle("")
    setTopicLessons([])
    setSelectedLessonIndex(null)
    if (unsubscribeTopic) {
      try { unsubscribeTopic() } catch {}
      setUnsubscribeTopic(null)
    }
    setAttachmentViewer(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!openTopicId || selectedLessonIndex == null) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedLessonIndex((prev) => {
          if (prev == null) return null
          const next = prev + 1
          return next >= filteredLessons.length ? prev : next
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedLessonIndex((prev) => {
          if (prev == null) return null
          const next = prev - 1
          return next < 0 ? 0 : next
        })
      } else if (e.key === "ArrowRight") {
        setActiveTab("media")
      } else if (e.key === "ArrowLeft") {
        setActiveTab("content")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openTopicId, selectedLessonIndex, activeTab, topicLessons])

  const filteredLessons = topicLessons
    .filter((l) => {
      const q = lessonQuery.toLowerCase().trim()
      if (!q) return true
      const title = String(l.title || "").toLowerCase()
      const content = String(l.content || "").toLowerCase()
      return title.includes(q) || content.includes(q)
    })
    .sort((a, b) => {
      if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""))
      const ta = new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
      const tb = new Date(String(b.updatedAt || b.createdAt || 0)).getTime()
      return tb - ta
    })

  if (!checked || loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-background">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      <StudentNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-3xl -z-10"></div>
            <div className="relative bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 md:p-10 border border-primary/20">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Learn
              </h1>
              <p className="text-muted-foreground">
                Explore lessons and practice by topic{profile?.classLevel ? ` for ${profile.classLevel}` : ""}.
              </p>
            </div>
          </div>
        </div>

        {topics.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No topics available yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((t, index) => (
              <Card
                key={t.id}
                className="p-6 bg-gradient-to-br from-card to-card/50 border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 ease-out"
                style={{ animation: `slideUp 0.5s ease-out ${index * 0.05}s forwards` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{t.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{t.classLevel}</Badge>
                      {typeof t.weekNumber === "number" && <Badge variant="outline">Week {t.weekNumber}</Badge>}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 p-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => router.push("/student/practice")}
                  >
                    Start Practice
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => router.push(`/student/learn/${t.id}`)}
                  >
                    {(() => {
                      const stat = lessonStats[t.id] || { count: 0 }
                      return stat.count > 0 ? `View ${stat.count} Lesson${stat.count > 1 ? "s" : ""}` : "View Lesson"
                    })()}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

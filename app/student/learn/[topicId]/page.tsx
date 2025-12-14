"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { StudentNav } from "@/components/student-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen } from "lucide-react"
import { useAuth } from "@/lib/auth-client"
// Removed direct Firestore reads to avoid permission errors when not signed into Firebase Auth

interface Topic {
  id: string
  title: string
  classLevel: "B7" | "B8"
  weekNumber?: number | null
}

export default function TopicLessonsPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ fullName?: string; classLevel?: "B7" | "B8" } | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"updated" | "title">("updated")
  const [tab, setTab] = useState<"content" | "media">("content")
  const [viewer, setViewer] = useState<{ url: string; type: "image" | "video"; name?: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    setChecked(true)
    async function loadProfile() {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const res = await fetch("/api/profile", { headers })
        if (res.ok) {
          const p = await res.json()
          setProfile({ fullName: p.fullName, classLevel: p.classLevel })
        }
      } finally {
        setLoading(false)
      }
    }
    if (!authLoading) {
      if (!user || user.role !== "student") {
        router.push("/login")
        return
      }
      loadProfile()
    }
  }, [router, authLoading, user])

  useEffect(() => {
    async function loadTopic() {
      const p = params as any
      const topicId = String(p.topicId || "")
      if (!topicId) return
      try {
        const res = await fetch("/api/topics")
        const list = res.ok ? await res.json() : []
        const found = Array.isArray(list) ? list.find((t: any) => String(t.id) === topicId) : null
        if (found) {
          setTopic({
            id: found.id,
            title: String(found.title || "Untitled"),
            classLevel: (found.classLevel || "B7") as "B7" | "B8",
            weekNumber: found.weekNumber ?? null,
          })
        }
      } catch {}
    }
    loadTopic()
  }, [params])

  useEffect(() => {
    async function loadLessons() {
      if (!profile?.classLevel) return
      const p = params as any
      const topicId = String(p.topicId || "")
      if (!topicId) return
      try {
        const token = localStorage.getItem("auth_token") || ""
        const headers = { Authorization: `Bearer ${token}` }
        const url = `/api/student/lessons?classLevel=${profile.classLevel}&topicId=${topicId}`
        const res = await fetch(url, { headers })
        const items = res.ok ? await res.json() : []
        items.sort((a: any, b: any) => new Date(String(b.updatedAt || b.createdAt || 0)).getTime() - new Date(String(a.updatedAt || a.createdAt || 0)).getTime())
        setLessons(Array.isArray(items) ? items : [])
        setSelectedIndex(items.length ? 0 : null)
      } catch {
        setLessons([])
        setSelectedIndex(null)
      }
    }
    loadLessons()
  }, [profile?.classLevel, params])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (selectedIndex == null) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => {
          if (prev == null) return null
          const next = prev + 1
          return next >= filtered.length ? prev : next
        })
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => {
          if (prev == null) return null
          const next = prev - 1
          return next < 0 ? 0 : next
        })
      } else if (e.key === "ArrowRight") {
        setTab("media")
      } else if (e.key === "ArrowLeft") {
        setTab("content")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedIndex, tab, lessons])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const list = lessons.filter((l) => {
      if (!q) return true
      return String(l.title || "").toLowerCase().includes(q) || String(l.content || "").toLowerCase().includes(q)
    })
    list.sort((a, b) => {
      if (sort === "title") return String(a.title || "").localeCompare(String(b.title || ""))
      const ta = new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
      const tb = new Date(String(b.updatedAt || b.createdAt || 0)).getTime()
      return tb - ta
    })
    return list
  }, [lessons, search, sort])

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
        <div className="mb-8">
          <div className="relative rounded-2xl p-6 md:p-10 border bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {topic?.title || "Lessons"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse lessons for {profile?.classLevel || topic?.classLevel || ""} and start practicing.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {topic?.weekNumber ? <Badge variant="outline">Week {topic.weekNumber}</Badge> : null}
              <Badge variant="secondary">{profile?.classLevel || topic?.classLevel}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons" className="flex-1" />
              <UiSelect value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Recent</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </UiSelect>
            </div>
            <ScrollArea className="max-h-[65vh] rounded-lg border bg-card">
              <div>
                {filtered.length === 0 ? (
                  <Card className="p-6 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No lessons available yet.</p>
                  </Card>
                ) : (
                  filtered.map((l, idx) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                        selectedIndex === idx ? "bg-primary/10 text-primary" : "hover:bg-accent/10"
                      }`}
                    >
                      <div className="font-medium line-clamp-2">{l.title || "Untitled"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(String(l.updatedAt || l.createdAt || "")).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  setSelectedIndex((prev) => {
                    if (prev == null) return 0
                    const next = prev - 1
                    return next < 0 ? 0 : next
                  })
                }
              >
                Previous
              </Button>
              <Button
                onClick={() =>
                  setSelectedIndex((prev) => {
                    if (prev == null) return 0
                    const next = prev + 1
                    return next >= filtered.length ? prev : next
                  })
                }
              >
                Next
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedIndex == null || !filtered[selectedIndex] ? (
              <Card className="p-6">
                <p className="text-muted-foreground">Select a lesson to view its content.</p>
              </Card>
            ) : (
              (() => {
                const l = filtered[selectedIndex] || {}
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{l.title || "Untitled"}</h2>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{profile?.classLevel || topic?.classLevel}</Badge>
                        {l.topicId ? <Badge variant="outline">Topic</Badge> : <Badge variant="outline">General</Badge>}
                      </div>
                    </div>
                    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
                      <TabsList>
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="media">Media</TabsTrigger>
                      </TabsList>
                      <TabsContent value="content">
                        <Card className="p-6">
                          {Array.isArray(l.objectives) && l.objectives.length > 0 && (
                            <div className="mb-4">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {l.objectives.map((o: any, i: number) => (
                                  <Badge key={i} variant="outline">{String(o)}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {l.content && (
                            <div className="max-w-none whitespace-pre-wrap leading-relaxed text-foreground/90 space-y-4">
                              {String(l.content)
                                .split(/\n{2,}/)
                                .map((para, i) => (
                                  <p key={i} className="break-words">{para}</p>
                                ))}
                            </div>
                          )}
                        </Card>
                        <div className="mt-4 flex gap-2">
                          <Button onClick={() => router.push("/student/practice")}>Start Practice</Button>
                          <Button variant="outline" onClick={() => setTab("media")}>View Media</Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="media">
                        {Array.isArray(l.attachments) && l.attachments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {l.attachments.map((att: any, i: number) => (
                              <Card key={i} className="overflow-hidden group cursor-pointer" onClick={() => setViewer({ url: att.url, type: att.type, name: att.name })}>
                                {att.type === "image" ? (
                                  <img src={att.url} alt={att.name || "image"} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                  <video src={att.url} controls className="w-full h-48 object-cover" />
                                )}
                                <div className="px-3 py-2 text-xs text-muted-foreground truncate">{att.name || att.mimeType || ""}</div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="p-6">
                            <p className="text-muted-foreground">No media attached.</p>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )
              })()
            )}
          </div>
        </div>

        {viewer && (
          <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4" onClick={() => setViewer(null)}>
            <div className="max-w-4xl w-full rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {viewer.type === "image" ? (
                <img src={viewer.url} alt={viewer.name || "image"} className="w-full h-auto" />
              ) : (
                <video src={viewer.url} controls className="w-full h-auto" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

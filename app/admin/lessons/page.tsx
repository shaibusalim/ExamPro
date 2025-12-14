"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth-client"
import { storage } from "@/lib/firebase"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"

interface Topic {
  id: string
  title: string
  classLevel: "B7" | "B8"
  weekNumber?: number | null
}

interface Lesson {
  id: string
  title: string
  classLevel: "B7" | "B8"
  topicId?: string | null
  objectives?: string[]
  content?: string
  createdAt?: string
  updatedAt?: string
  attachments?: { url: string; type: "image" | "video"; name?: string; size?: number; mimeType?: string }[]
}

export default function AdminLessonsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [token, setToken] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create")
  const [classLevel, setClassLevel] = useState<"B7" | "B8">("B7")
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    title: "",
    classLevel: "B7" as "B7" | "B8",
    topicId: null as string | null,
    objectivesText: "",
    content: "",
    attachments: [] as { url: string; type: "image" | "video"; name?: string; size?: number; mimeType?: string }[],
  })

  useEffect(() => {
    const t = localStorage.getItem("auth_token")
    if (!t) {
      router.push("/login")
      setLoading(false)
      return
    }
    setToken(t)

    async function load() {
      setLoading(true)
      try {
        const headers = { Authorization: `Bearer ${t}` }
        const topicsRes = await fetch(`/api/topics?classLevel=${classLevel}`, { headers })
        const lessonsRes = await fetch(`/api/admin/lessons?classLevel=${classLevel}`, { headers })
        const topicsData = topicsRes.ok ? await topicsRes.json() : []
        const lessonsData = lessonsRes.ok ? await lessonsRes.json() : []
        setTopics(Array.isArray(topicsData) ? topicsData : [])
        setLessons(Array.isArray(lessonsData) ? lessonsData : [])
      } catch {
        setTopics([])
        setLessons([])
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      if (!user || user.role !== "admin") {
        router.push("/login")
        setLoading(false)
        return
      }
      load()
    }
  }, [router, authLoading, user, classLevel])

  useEffect(() => {
    setForm((prev) => ({ ...prev, classLevel }))
  }, [classLevel])

  async function createLesson(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      const objectives = form.objectivesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch("/api/admin/lessons", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: form.title,
          classLevel: form.classLevel,
          topicId: form.topicId || null,
          objectives,
          content: form.content,
          attachments: form.attachments,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        setError(body?.error || "Failed to create lesson")
        return
      }
      const created = await res.json()
      setLessons((prev) => [{ ...created, id: created.id }, ...prev])
      setForm({ title: "", classLevel, topicId: null, objectivesText: "", content: "", attachments: [] })
      setSuccess("Lesson created")
      setActiveTab("manage")
    } catch {
      setError("Failed to create lesson")
    }
  }

  async function deleteLesson(id: string) {
    if (!id) return
    if (!window.confirm("Delete this lesson? This cannot be undone.")) return
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`/api/admin/lessons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any))
        setError(body?.error || "Failed to delete lesson")
        return
      }
      setLessons((prev) => prev.filter((l) => l.id !== id))
      setSuccess("Lesson deleted")
    } catch {
      setError("Failed to delete lesson")
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 space-y-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
              Lessons
            </h1>
          </div>
          <p className="text-slate-400">Create and manage learning content for students</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <Label>Class Level</Label>
            <Select value={classLevel} onValueChange={(v) => setClassLevel(v as "B7" | "B8")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="B7">Basic 7</SelectItem>
                <SelectItem value="B8">Basic 8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Tabs defaultValue="create" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Create Lesson</TabsTrigger>
            <TabsTrigger value="manage">Manage Lessons</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="p-6 space-y-4">
              <form onSubmit={createLesson} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Topic (optional)</Label>
                    <Select value={form.topicId ?? undefined} onValueChange={(v) => setForm({ ...form, topicId: v === "__NONE__" ? null : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">None</SelectItem>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objectives">Learning Objectives (one per line)</Label>
                  <Textarea
                    id="objectives"
                    value={form.objectivesText}
                    onChange={(e) => setForm({ ...form, objectivesText: e.target.value })}
                    placeholder="Describe outcomes learners should achieve..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Lesson Content</Label>
                  <Textarea
                    id="content"
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write lesson content (supports plain text for now)"
                    rows={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media">Media (images or videos)</Label>
                  <input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files || files.length === 0) return
                      setError("")
                      setUploading(true)
                      try {
                        const uploads: { url: string; type: "image" | "video"; name?: string; size?: number; mimeType?: string }[] = []
                        for (const file of Array.from(files)) {
                          const isImage = file.type.startsWith("image/")
                          const isVideo = file.type.startsWith("video/")
                          if (!isImage && !isVideo) continue
                          const path = `lessons/${classLevel}/${Date.now()}-${file.name}`
                          const r = storageRef(storage, path)
                          await uploadBytes(r, file)
                          const url = await getDownloadURL(r)
                          uploads.push({ url, type: isImage ? "image" : "video", name: file.name, size: file.size, mimeType: file.type })
                        }
                        setForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }))
                      } catch {
                        setError("Failed to upload media")
                      } finally {
                        setUploading(false)
                        e.target.value = ""
                      }
                    }}
                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-blue-900/30 file:bg-slate-900/50 file:text-slate-200 hover:file:bg-slate-800/50"
                  />
                  {form.attachments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {form.attachments.map((att, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-blue-900/20 bg-slate-900/30">
                          {att.type === "image" ? (
                            <img src={att.url} alt={att.name || "image"} className="w-full h-32 object-cover" />
                          ) : (
                            <video src={att.url} controls className="w-full h-32 object-cover" />
                          )}
                          <div className="p-2 flex items-center justify-between">
                            <span className="text-xs text-slate-300 truncate">{att.name}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== idx),
                                }))
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploading && <div className="text-xs text-slate-300">Uploading...</div>}
                </div>
                {error && (
                  <div className="text-red-400 text-sm">{error}</div>
                )}
                {success && (
                  <div className="text-green-400 text-sm">{success}</div>
                )}
                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lesson
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            {lessons.length === 0 ? (
              <Card className="p-12 text-center bg-slate-900/50 border-blue-900/30">
                <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-60" />
                <p className="text-slate-400">No lessons yet. Create your first lesson.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lessons.map((l, idx) => (
                  <Card
                    key={l.id}
                    className="p-6 bg-gradient-to-br from-slate-900/40 to-slate-900/10 border border-blue-900/20 hover:border-blue-500/40 transition-all"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-100">{l.title}</h3>
                          <Badge variant="secondary">{l.classLevel}</Badge>
                        </div>
                        {Array.isArray(l.objectives) && l.objectives.length > 0 && (
                          <div className="mt-3 text-sm text-slate-300 bg-slate-900/30 p-3 rounded-lg">
                            <p className="font-semibold text-slate-200 mb-2">Objectives:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              {l.objectives.map((o, i) => <li key={i}>{o}</li>)}
                            </ul>
                          </div>
                        )}
                        {l.content && (
                          <div className="mt-3 text-sm text-slate-300">
                            <p className="line-clamp-3">{l.content}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" onClick={() => router.push(`/admin/lessons?edit=${l.id}`)}>Edit</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteLesson(l.id)}>Delete</Button>
                      </div>
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

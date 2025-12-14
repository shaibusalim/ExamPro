import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { lessonId } = await params
  const id = String(lessonId)
  const body = await request.json()
  const updates: Record<string, any> = {}
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim()
  if (typeof body.classLevel === "string" && ["B7", "B8"].includes(body.classLevel)) updates.classLevel = body.classLevel
  if (body.topicId === null) updates.topicId = null
  if (typeof body.topicId === "string" && body.topicId.trim()) updates.topicId = body.topicId.trim()
  if (Array.isArray(body.objectives)) updates.objectives = body.objectives.map((o: any) => String(o)).filter(Boolean)
  if (typeof body.content === "string") updates.content = body.content
  if (Array.isArray(body.attachments)) {
    const safeAttachments = body.attachments
      .map((a: any) => ({
        url: typeof a?.url === "string" ? a.url : "",
        type: a?.type === "image" || a?.type === "video" ? a.type : undefined,
        name: typeof a?.name === "string" ? a.name : undefined,
        size: typeof a?.size === "number" ? a.size : undefined,
        mimeType: typeof a?.mimeType === "string" ? a.mimeType : undefined,
      }))
      .filter((a: any) => a.url && a.type)
    updates.attachments = safeAttachments
  }
  updates.updatedAt = new Date().toISOString()
  if (Object.keys(updates).length === 1 && "updatedAt" in updates) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }
    await firestore.collection("lessons").doc(id).set(updates, { merge: true })
    const doc = await firestore.collection("lessons").doc(id).get()
    if (!doc.exists) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    return NextResponse.json({ id, ...(doc.data() as any) })
  } catch (e) {
    console.error("[API/Admin/Lessons] PATCH error:", e)
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { lessonId } = await params
    const id = String(lessonId)
    await firestore.collection("lessons").doc(id).delete()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/Lessons] DELETE error:", e)
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { title, classLevel, topicId, objectives, content, attachments } = body || {}
    if (!title || !classLevel) {
      return NextResponse.json({ error: "Title and classLevel required" }, { status: 400 })
    }

    const safeAttachments = Array.isArray(attachments)
      ? attachments
          .map((a: any) => ({
            url: typeof a?.url === "string" ? a.url : "",
            type: a?.type === "image" || a?.type === "video" ? a.type : undefined,
            name: typeof a?.name === "string" ? a.name : undefined,
            size: typeof a?.size === "number" ? a.size : undefined,
            mimeType: typeof a?.mimeType === "string" ? a.mimeType : undefined,
          }))
          .filter((a: any) => a.url && a.type)
      : []

    const lesson = {
      title: String(title),
      classLevel: String(classLevel),
      topicId: topicId ? String(topicId) : null,
      objectives: Array.isArray(objectives) ? objectives.map((o: any) => String(o)).filter(Boolean) : [],
      content: String(content || ""),
      attachments: safeAttachments,
      createdBy: decoded.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: true,
    }
    const ref = await firestore.collection("lessons").add(lesson as any)
    return NextResponse.json({ id: ref.id, ...lesson }, { status: 201 })
  } catch (e) {
    console.error("[API/Admin/Lessons] POST error:", e)
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const classLevel = request.nextUrl.searchParams.get("classLevel") || undefined
    const topicId = request.nextUrl.searchParams.get("topicId") || undefined
    let q = firestore.collection("lessons") as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
    if (classLevel) q = q.where("classLevel", "==", classLevel)
    if (topicId) q = q.where("topicId", "==", topicId)
    const snap = await q.get()
    const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    out.sort((a, b) => {
      const ta = new Date(String(a.updatedAt || a.createdAt || 0)).getTime()
      const tb = new Date(String(b.updatedAt || b.createdAt || 0)).getTime()
      return tb - ta
    })
    return NextResponse.json(out)
  } catch (e) {
    console.error("[API/Admin/Lessons] GET error:", e)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}

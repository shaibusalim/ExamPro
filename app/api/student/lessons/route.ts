import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const classLevel = request.nextUrl.searchParams.get("classLevel") || undefined
    const topicId = request.nextUrl.searchParams.get("topicId") || undefined
    let q = firestore.collection("lessons") as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
    q = q.where("isPublished", "==", true)
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
    console.error("[API/Student/Lessons] GET error:", e)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}

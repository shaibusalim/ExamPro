import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { examId } = await params
    const id = String(examId)

    const examRef = firestore.collection("exams").doc(id)
    const questionsSnap = await examRef.collection("questions").get()
    if (!questionsSnap.empty) {
      const batch = firestore.batch()
      for (const q of questionsSnap.docs) {
        batch.delete(q.ref)
      }
      await batch.commit()
    }

    await examRef.delete()

    const attemptsSnap = await firestore.collection("exam_attempts").where("examId", "==", id).get()
    if (!attemptsSnap.empty) {
      const batch = firestore.batch()
      for (const d of attemptsSnap.docs) {
        batch.delete(d.ref)
      }
      await batch.commit()
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/Exams/Delete] Error:", e)
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 })
  }
}

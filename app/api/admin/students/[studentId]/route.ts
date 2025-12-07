import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function DELETE(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const studentId = String(params.studentId)
    await firestore.collection("users").doc(studentId).delete()
    const attemptsSnap = await firestore.collection("exam_attempts").where("studentId", "==", studentId).get()
    const batch = firestore.batch()
    attemptsSnap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/Students/Delete] Error:", e)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { studentId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const studentId = String(params.studentId)
    const body = await request.json()
    const allowed: Record<string, any> = {}
    ;["fullName", "classLevel", "lockedDashboard", "lockedExams"].forEach((k) => {
      if (k in body) allowed[k] = body[k]
    })
    if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    await firestore.collection("users").doc(studentId).update(allowed)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/Students/Edit] Error:", e)
    return NextResponse.json({ error: "Failed to edit student" }, { status: 500 })
  }
}

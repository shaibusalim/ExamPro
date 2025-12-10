import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore, auth as adminAuth } from "@/lib/firebaseAdmin"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params
    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 })
    }

    const userRef = firestore.collection("users").doc(studentId)
    const userDoc = await userRef.get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    await userRef.delete()
    // Verify deletion
    const verifyDoc = await userRef.get()
    if (verifyDoc.exists) {
      return NextResponse.json({ error: "Deletion failed: document still exists" }, { status: 500 })
    }

    const enrollments = await firestore.collection("enrollments").where("studentId", "==", studentId).get()
    const attempts = await firestore.collection("exam_attempts").where("studentId", "==", studentId).get()
    const batch = firestore.batch()
    enrollments.docs.forEach((d) => batch.delete(d.ref))
    attempts.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()

    try {
      await adminAuth.deleteUser(studentId)
    } catch (e) {
      console.warn("[Admin/Students] Auth delete failed:", e)
    }

    return NextResponse.json({ message: "Student deleted", removed: { enrollments: enrollments.size, attempts: attempts.size } })
  } catch (error) {
    console.error("[Admin/Students] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params
    const body = await request.json()
    const payload: Record<string, any> = {}
    if (typeof body.fullName === "string" && body.fullName.trim()) payload.fullName = body.fullName.trim()
    if (typeof body.classLevel === "string" && ["B7", "B8"].includes(body.classLevel)) payload.classLevel = body.classLevel

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    await firestore.collection("users").doc(studentId).set(payload, { merge: true })
    return NextResponse.json({ message: "Student updated", updated: payload })
  } catch (error) {
    console.error("[Admin/Students] PATCH error:", error)
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
  }
}

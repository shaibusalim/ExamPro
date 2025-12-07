import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { studentId, lockDashboard, lockExams } = body || {}
    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 })
    }

    const userRef = firestore.collection("users").doc(String(studentId))
    const updates: Record<string, any> = {}
    if (typeof lockDashboard === "boolean") updates.lockedDashboard = lockDashboard
    if (typeof lockExams === "boolean") updates.lockedExams = lockExams
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await userRef.update(updates)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[API/Admin/LockStudent] Error:", e)
    return NextResponse.json({ error: "Failed to update lock state" }, { status: 500 })
  }
}

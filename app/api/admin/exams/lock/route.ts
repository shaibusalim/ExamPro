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

    const { examId, lock } = await request.json()

    if (!examId || typeof lock === "undefined") {
      return NextResponse.json({ error: "Exam ID and lock status are required" }, { status: 400 })
    }

    const examRef = firestore.collection("exams").doc(examId)
    await examRef.update({ locked: lock })

    return NextResponse.json({ message: `Exam ${examId} lock status updated to ${lock}` })
  } catch (error) {
    console.error("[Firebase] Error updating exam lock status:", error)
    return NextResponse.json({ error: "Failed to update exam lock status" }, { status: 500 })
  }
}

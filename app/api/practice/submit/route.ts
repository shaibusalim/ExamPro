import { type NextRequest, NextResponse } from "next/server"
import { firestore } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = body.user || {}
    const payload = {
      userId: user.id || null,
      fullName: user.fullName || null,
      classLevel: user.classLevel || null,
      score: body.score || { total: 0, correct: 0 },
      scoredMarks: typeof body.scoredMarks === 'number' ? body.scoredMarks : 0,
      totalMarks: typeof body.totalMarks === 'number' ? body.totalMarks : 0,
      pass: !!body.pass,
      topics: body.topics || [],
      responses: body.responses || {},
      questions: body.questions || [],
      createdAt: new Date().toISOString(),
    }
    const ref = await firestore.collection("practice_attempts").add(payload)
    return NextResponse.json({ attemptId: ref.id })
  } catch (error) {
    console.error("[API/PracticeSubmit] Error:", error)
    return NextResponse.json({ error: "Failed to store practice attempt" }, { status: 500 })
  }
}

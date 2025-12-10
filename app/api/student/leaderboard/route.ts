import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

interface StudentScore {
  id: string
  full_name: string
  avg_score: number
  total_exams: number
  passed_exams: number
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
  const decoded = verifyToken(token)
  if (!decoded || decoded.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentStudentId = decoded.userId
  const userDoc = await firestore.collection("users").doc(currentStudentId).get()
  const userData = userDoc.exists ? (userDoc.data() as any) : null
  if (userData?.lockedDashboard) {
    return NextResponse.json({ error: "Dashboard locked" }, { status: 403 })
  }
  const classLevel = String(userData?.classLevel || "")

    const usersSnap = await firestore.collection("users").get()
    const candidates = usersSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((u) => (u.role || "student") === "student")
      .filter((u) => (classLevel ? String(u.classLevel || "") === classLevel : true))

    const results: StudentScore[] = []
    for (const u of candidates) {
      const attemptsSnap = await firestore
        .collection("exam_attempts")
        .where("studentId", "==", u.id)
        .where("status", "==", "completed")
        .get()

      let totalExams = 0
      let passed = 0
      let pctSum = 0

      attemptsSnap.forEach((doc) => {
        const a = doc.data() as any
        const total = Number(a.totalMarks || 0)
        const score = Number(a.score || 0)
        const pct = total > 0 ? (score / total) * 100 : 0
        totalExams++
        pctSum += pct
        if (pct >= 50) passed++
      })

      const avg = totalExams > 0 ? Math.round((pctSum / totalExams) * 100) / 100 : 0
      results.push({
        id: u.id,
        full_name: String(u.fullName || u.name || ""),
        avg_score: avg,
        total_exams: totalExams,
        passed_exams: passed,
      })
    }

    results.sort((a, b) => {
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
      return b.total_exams - a.total_exams
    })

    return NextResponse.json(results.slice(0, 50))
  } catch (e) {
    console.error("[API/Student/Leaderboard] Error:", e)
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 })
  }
}

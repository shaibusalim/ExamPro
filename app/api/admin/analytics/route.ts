import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const attemptsSnap = await firestore.collection("exam_attempts").get()

    let totalSubmissions = 0
    let passedCount = 0
    let highestScore = 0
    let lowestScore = 100
    let scoreSum = 0

    const examMap = new Map<string, { id: string; title: string; avg_score_sum: number; submissions: number }>()

    for (const docSnap of attemptsSnap.docs) {
      const a = docSnap.data() as any
      if (typeof a.score === "number") {
        totalSubmissions++
        scoreSum += a.score
        highestScore = Math.max(highestScore, a.score)
        lowestScore = Math.min(lowestScore, a.score)
        if (typeof a.passingMarks === "number" && typeof a.totalMarks === "number") {
          const pct = a.totalMarks > 0 ? (a.score / a.totalMarks) * 100 : 0
          if (pct >= 50) passedCount++
        }
      }
      const examId = a.examId
      if (examId) {
        let info = examMap.get(examId)
        if (!info) {
          // Fetch exam title once
          const examDoc = await firestore.collection("exams").doc(examId).get()
          const title = examDoc.exists ? ((examDoc.data() as any).title || "Exam") : "Exam"
          info = { id: examId, title, avg_score_sum: 0, submissions: 0 }
        }
        if (typeof a.score === "number") {
          info.avg_score_sum += a.score
          info.submissions += 1
        }
        examMap.set(examId, info)
      }
    }

    const avgScore = totalSubmissions > 0 ? scoreSum / totalSubmissions : 0
    if (lowestScore === 100 && totalSubmissions === 0) lowestScore = 0

    const examBreakdown = Array.from(examMap.values()).map(e => ({
      id: e.id,
      title: e.title,
      avg_score: e.submissions > 0 ? parseFloat((e.avg_score_sum / e.submissions).toFixed(2)) : 0,
      submissions: e.submissions,
      passed: 0,
    }))

    // Student performance summary (lightweight)
    const studentsSnap = await firestore.collection("users").where("role", "==", "student").get()
    const studentPerformance: any[] = []
    for (const uDoc of studentsSnap.docs) {
      const studentId = uDoc.id
      const sAttemptsQSnap = await firestore.collection("exam_attempts").where("studentId", "==", studentId).get()
      let sScoreSum = 0
      let sCount = 0
      for (const attDoc of sAttemptsQSnap.docs) {
        const d = attDoc.data() as any
        if (typeof d.score === "number") { sScoreSum += d.score; sCount++ }
      }
      const u = uDoc.data() as any
      studentPerformance.push({
        id: studentId,
        full_name: u.fullName || "",
        email: u.email || "",
        avg_score: sCount > 0 ? parseFloat((sScoreSum / sCount).toFixed(2)) : 0,
        total_exams: sCount,
        passed_exams: null,
      })
    }

    return NextResponse.json({
      summary: {
        avg_score: parseFloat(avgScore.toFixed(2)),
        highest_score: highestScore,
        lowest_score: lowestScore,
        total_submissions: totalSubmissions,
        passed_count: passedCount,
      },
      examBreakdown,
      studentPerformance,
    })
  } catch (e) {
    console.error("[API/Admin/Analytics] Error:", e)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}

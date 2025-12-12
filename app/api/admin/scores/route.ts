import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const classLevel = request.nextUrl.searchParams.get("classLevel") || undefined

    let usersQuery = firestore.collection("users").where("role", "==", "student")
    if (classLevel) usersQuery = usersQuery.where("classLevel", "==", classLevel)
    const usersSnap = await usersQuery.get()

    const out: any[] = []
    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data() as any
      const studentId = uDoc.id
      const attemptsSnap = await firestore.collection("exam_attempts").where("studentId", "==", studentId).get()
      const attempts: any[] = []
      for (const aDoc of attemptsSnap.docs) {
        const a = aDoc.data() as any
        const examId = String(a.examId || "")
        let examTitle = "Exam"
        if (examId) {
          const eDoc = await firestore.collection("exams").doc(examId).get()
          if (eDoc.exists) examTitle = String((eDoc.data() as any).title || examTitle)
        }
        const score = Number(a.score || 0)
        const total = Number(a.totalMarks || 0)
        const percentage = total > 0 ? Math.round((score / total) * 100) : Number(a.percentage || 0)
        const submittedAt = a.submittedAt?.toDate?.() ? a.submittedAt.toDate().toISOString() : null
        attempts.push({ examId, examTitle, score, totalMarks: total, percentage, submittedAt })
      }
      attempts.sort((ia, ib) => {
        const at = Number(new Date(String(ia.submittedAt || 0)).getTime())
        const bt = Number(new Date(String(ib.submittedAt || 0)).getTime())
        return bt - at
      })
      out.push({
        id: studentId,
        fullName: String(u.fullName || u.name || ""),
        email: String(u.email || ""),
        classLevel: String(u.classLevel || ""),
        attempts,
      })
    }

    out.sort((a, b) => a.fullName.localeCompare(b.fullName))
    return NextResponse.json(out)
  } catch (e) {
    console.error("[API/Admin/Scores] Error:", e)
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 })
  }
}


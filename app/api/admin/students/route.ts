import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { firestore } from "@/lib/firebaseAdmin"

interface AdminStudentSummary {
  id: string
  fullName: string
  email: string
  classLevel?: string
  studentId?: string
  lockedDashboard?: boolean
  lockedExams?: boolean
  totalExamsAttempted: number
  averageScore: number
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      console.log("[API/Admin/Students] Unauthorized: No auth header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      console.log("[API/Admin/Students] Unauthorized: Invalid token or not admin", { decodedRole: decoded?.role })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[API/Admin/Students] Fetching users...")
    const snap = await firestore.collection("users").get() // Fetch all users

    console.log(`[API/Admin/Students] Fetched ${snap.docs.length} user documents.`) // Log number of documents

    const out: AdminStudentSummary[] = []
    for (const userDoc of snap.docs) {
      const u = userDoc.data() as any
      const userId = userDoc.id

      console.log(`[API/Admin/Students] Processing user: ${userId}, Email: ${u.email}, Role: ${u.role}`) // Log user details

      // Exclude the hardcoded admin user and any user explicitly marked as 'admin' or 'teacher'
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
      if (u.email === adminEmail || u.role === "admin" || u.role === "teacher") {
        console.log(`[API/Admin/Students] Skipping user ${userId} due to admin/teacher role or matching admin email.`) // Log skipped users
        continue;
      }

      const studentId = userId;
      console.log(`[API/Admin/Students] User ${studentId} identified as potential student. Fetching exam attempts...`) // Log potential students

      const attemptsSnap = await firestore.collection("exam_attempts").where("studentId", "==", studentId).get()

      let totalScore = 0
      let attempted = 0
      attemptsSnap.forEach(d => {
        const a = d.data() as any
        if (typeof a.score === "number") {
          totalScore += a.score
          attempted++
        }
      })

      console.log(`[API/Admin/Students] Student ${studentId} attempts: ${attempted}, total score: ${totalScore}`)

      out.push({
        id: studentId,
        fullName: u.fullName || "",
        email: u.email || "",
        classLevel: u.classLevel || undefined,
        studentId: u.studentId || undefined,
        lockedDashboard: !!u.lockedDashboard,
        lockedExams: !!u.lockedExams,
        totalExamsAttempted: attempted,
        averageScore: attempted > 0 ? parseFloat((totalScore / attempted).toFixed(2)) : 0,
      })
    }

    console.log(`[API/Admin/Students] Final student list size: ${out.length}`)
    return NextResponse.json(out)
  } catch (e) {
    console.error("[API/Admin/Students] Error:", e)
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}

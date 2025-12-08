import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await context.params;
    const studentId = decoded.userId;

    const attemptsSnap = await firestore
      .collection("exam_attempts")
      .where("examId", "==", examId)
      .where("studentId", "==", studentId)
      .get();

    if (attemptsSnap.empty) {
      return NextResponse.json({ error: "No attempt found" }, { status: 404 });
    }

    // Prefer completed attempts; otherwise return latest by submittedAt/startedAt
    const attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const completed = attempts.filter((a) => String(a.status || "") === "completed");
    const pick = (list: any[]) => {
      return list
        .slice()
        .sort((a, b) => {
          const at = Number(new Date(String(a.submittedAt || a.startedAt || 0)).getTime());
          const bt = Number(new Date(String(b.submittedAt || b.startedAt || 0)).getTime());
          return bt - at;
        })[0];
    };
    const best = completed.length > 0 ? pick(completed) : pick(attempts);
    if (!best) {
      return NextResponse.json({ error: "No attempt found" }, { status: 404 });
    }

    const score = Number(best.score || 0);
    const totalMarks = Number(best.totalMarks || 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : Number(best.percentage || 0);
    const submittedAt = best.submittedAt?.toDate?.() ? best.submittedAt.toDate().toISOString() : new Date().toISOString();

    return NextResponse.json({
      score,
      total_marks: totalMarks,
      percentage,
      submitted_at: submittedAt,
    });
  } catch (error) {
    console.error("[API/Student/Exam/Result] Error:", error);
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}


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
    const answersObj = (best.answers || {}) as Record<string, any>;
    const questionIds = Object.keys(answersObj);
    const answers: any[] = [];
    for (const qid of questionIds) {
      const ans = answersObj[qid] || {};
      // Load question to extract text, type, marks, and correct answer
      const qTopDoc = await firestore.collection("questions").doc(qid).get();
      let qData: any = null;
      if (qTopDoc.exists) {
        qData = qTopDoc.data();
      } else {
        const eqSnap = await firestore.collection("exams").doc(examId).collection("questions").doc(qid).get();
        if (eqSnap.exists) qData = eqSnap.data();
      }
      const qTypeRaw = String(qData?.questionType || qData?.type || qData?.question_type || "mcq").toLowerCase();
      const typeMap: Record<string, string> = { mcq: "mcq", "true_false": "true_false", essay: "essay", theory: "essay" };
      const qType = typeMap[qTypeRaw] || "mcq";
      const marks = Number(qData?.marks || 1);
      const questionText = String(qData?.questionText || qData?.question || qData?.question_text || "");

      let correctAnswer: string | null = null;
      if (qType === "mcq" || qType === "true_false") {
        const optSnap = await firestore.collection("questions").doc(qid).collection("options").get();
        const correctOpt = optSnap.docs.find((d) => (d.data() as any).isCorrect === true);
        correctAnswer = correctOpt ? String((correctOpt.data() as any).optionText || "") : null;
      } else {
        const cr = (qData as any)?.correctAnswer;
        if (Array.isArray(cr)) {
          correctAnswer = String(cr.filter(Boolean).join('; ')) || null;
        } else {
          correctAnswer = String(cr || (qData as any)?.explanation || "") || null;
        }
      }

      answers.push({
        questionId: qid,
        question_text: questionText,
        question_type: qType,
        marks,
        marks_awarded: Number(ans.marksAwarded || 0),
        is_correct: !!ans.isCorrect,
        student_answer: ans.textResponse ?? ans.selectedOptionText ?? ans.selectedOptionId ?? null,
        correct_answer: correctAnswer,
      });
    }

    return NextResponse.json({
      score,
      total_marks: totalMarks,
      percentage,
      submitted_at: submittedAt,
      answers,
    });
  } catch (error) {
    console.error("[API/Student/Exam/Result] Error:", error);
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}


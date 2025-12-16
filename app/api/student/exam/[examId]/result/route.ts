import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const examId = String(params.examId || "");
    const studentId = decoded.userId;
    const attemptIdParam = request.nextUrl.searchParams.get("attemptId");

    // If attemptId is provided, fetch it directly
    if (attemptIdParam) {
      const attemptDoc = await firestore.collection("exam_attempts").doc(String(attemptIdParam)).get();
      if (!attemptDoc.exists) {
        return NextResponse.json({ error: "No result found" }, { status: 404 });
      }
      const best = attemptDoc.data() as any;
      if (String(best.studentId || "") !== studentId || String(best.examId || "") !== examId) {
        return NextResponse.json({ error: "No result found" }, { status: 404 });
      }
      const score = Number(best.score || 0);
      const totalMarks = Number(best.totalMarks || 0);
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : Number(best.percentage || 0);
      const submittedAt = best.submittedAt?.toDate?.() ? best.submittedAt.toDate().toISOString() : new Date().toISOString();
      const attemptStatus = String(best.status || "");
      if (attemptStatus === "pending_review" || best.adminReviewed === false) {
        return NextResponse.json(
          {
            status: "pending_review",
            submitted_at: submittedAt,
            message: "Your results will be available after admin review.",
          },
          { status: 202 }
        );
      }
      const answersObjDirect = (best.answers || {}) as Record<string, any>;
      const questionIdsDirect = Object.keys(answersObjDirect);
      const answersDirect: any[] = [];
      for (const qid of questionIdsDirect) {
        const ans = answersObjDirect[qid] || {};
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
            correctAnswer = String(cr.filter(Boolean).join("; ")) || null;
          } else {
            correctAnswer = String(cr || (qData as any)?.explanation || "") || null;
          }
        }
        answersDirect.push({
          questionId: qid,
          question_text: questionText,
          question_type: qType,
          marks,
          marks_awarded: Number(ans.marksAwarded || 0),
          is_correct: !!ans.isCorrect,
          student_answer: ans.studentAnswer ?? ans.textResponse ?? ans.selectedOptionText ?? ans.selectedOptionId ?? null,
          correct_answer: correctAnswer,
        });
      }
      return NextResponse.json({
        status: String(best.status || "published"),
        score,
        total_marks: totalMarks,
        percentage,
        submitted_at: submittedAt,
        answers: answersDirect,
      });
    }

    const attemptsSnap = await firestore
      .collection("exam_attempts")
      .where("examId", "==", examId)
      .where("studentId", "==", studentId)
      .get();
    if (attemptsSnap.empty) {
      return NextResponse.json({ error: "No result found" }, { status: 404 });
    }

    const attempts = attemptsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const preferred = attempts.filter((a) => ["published", "completed"].includes(String(a.status || "")));
    const pickLatest = (list: any[]) =>
      list
        .slice()
        .sort((a, b) => {
          const at = a.submittedAt?.toDate?.() ? a.submittedAt.toDate().getTime() : (a.updatedAt?.toDate?.() ? a.updatedAt.toDate().getTime() : 0);
          const bt = b.submittedAt?.toDate?.() ? b.submittedAt.toDate().getTime() : (b.updatedAt?.toDate?.() ? b.updatedAt.toDate().getTime() : 0);
          return bt - at;
        })[0];
    const best = preferred.length > 0 ? pickLatest(preferred) : pickLatest(attempts);
    if (!best) {
      return NextResponse.json({ error: "No result found" }, { status: 404 });
    }

    const score = Number(best.score || 0);
    const totalMarks = Number(best.totalMarks || 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : Number(best.percentage || 0);
    const submittedAt = best.submittedAt?.toDate?.() ? best.submittedAt.toDate().toISOString() : new Date().toISOString();
    const attemptStatus = String(best.status || "");
    if (attemptStatus === "pending_review" || best.adminReviewed === false) {
      return NextResponse.json(
        {
          status: "pending_review",
          submitted_at: submittedAt,
          message: "Your results will be available after admin review.",
        },
        { status: 202 }
      );
    }

    const answersObj = (best.answers || {}) as Record<string, any>;
    const questionIds = Object.keys(answersObj);
    const answers: any[] = [];
    for (const qid of questionIds) {
      const ans = answersObj[qid] || {};
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
          correctAnswer = String(cr.filter(Boolean).join("; ")) || null;
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
        student_answer: ans.studentAnswer ?? ans.textResponse ?? ans.selectedOptionText ?? ans.selectedOptionId ?? null,
        correct_answer: correctAnswer,
      });
    }

    return NextResponse.json({
      status: String(best.status || "published"),
      score,
      total_marks: totalMarks,
      percentage,
      submitted_at: submittedAt,
      answers,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch result" }, { status: 500 });
  }
}

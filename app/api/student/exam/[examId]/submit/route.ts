import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { gradeTheoryAnswer } from "@/lib/ai-service";

export async function POST(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
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

    const { attemptId, responses } = await request.json();
    const { examId } = await context.params;
    const studentId = decoded.userId;

    // 1. Get exam attempt
    const attemptRef = firestore.collection("exam_attempts").doc(attemptId);
    const attemptDoc = await attemptRef.get();

    if (!attemptDoc.exists || attemptDoc.data()?.studentId !== studentId || attemptDoc.data()?.examId !== examId) {
      return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
    }

    const attemptData = attemptDoc.data() as any;
    if (attemptData.status === "completed") {
      return NextResponse.json({ error: "Exam already submitted" }, { status: 400 });
    }

    let totalScore = 0;
    let totalPossibleMarks = 0;
    const studentAnswers: { [questionId: string]: any } = {};
    const topicAggregate: { [topicId: string]: { score: number; total: number } } = {};
 
    const selectedQuestionIds: string[] = Array.isArray(attemptData.selectedQuestionIds) ? attemptData.selectedQuestionIds : [];
    const responseMap: Record<string, any> = {};
    if (Array.isArray(responses)) {
      for (const r of responses) {
        if (r && r.questionId) responseMap[String(r.questionId)] = r;
      }
    }
 
    for (const questionId of selectedQuestionIds) {
      const questionTopDoc = await firestore.collection("questions").doc(questionId).get();
 
      let q: any = null;
      if (questionTopDoc.exists) {
        q = questionTopDoc.data();
      } else {
        const eqSnap = await firestore
          .collection("exams")
          .doc(examId)
          .collection("questions")
          .doc(questionId)
          .get();
        if (eqSnap.exists) q = eqSnap.data();
        if (!q) {
          console.warn(`Question ${questionId} not found during grading.`);
          continue;
        }
      }
 
      const questionMarks = Number(q.marks || 1);
      totalPossibleMarks += questionMarks;
 
      const type = String(q.questionType || q.type || q.question_type || "mcq").toLowerCase();
      const topicId = String((q as any).topicId || "");
      const response = responseMap[questionId];
 
      let isCorrect = false;
      let marksAwarded = 0;
      let isAnswered = !!response;
 
      if (isAnswered) {
        if (type === "mcq" || type === "true_false") {
          const selectedId = response.selectedOptionId || response.selectedOptionText || response.selectedOption || null;
          const optSnap = await firestore.collection("questions").doc(questionId).collection("options").get();
          const correctOpt = optSnap.docs.find((d) => (d.data() as any).isCorrect === true);
          if (correctOpt) {
            const correctId = correctOpt.id;
            if (String(selectedId) === String(correctId)) {
              isCorrect = true;
              marksAwarded = questionMarks;
              totalScore += marksAwarded;
            } else {
              const selectedText = String(response.selectedOptionText || response.selectedOptionId || "").toLowerCase();
              const correctText = String((correctOpt.data() as any).optionText || "").toLowerCase();
              if (selectedText && correctText && selectedText === correctText) {
                isCorrect = true;
                marksAwarded = questionMarks;
                totalScore += marksAwarded;
              } else if (type === "true_false") {
                const tf = ["true", "false"];
                if (tf.includes(String(selectedId).toLowerCase())) {
                  const match = optSnap.docs.find((d) => String((d.data() as any).optionText || "").toLowerCase() === String(selectedId).toLowerCase());
                  if (match && (match.data() as any).isCorrect === true) {
                    isCorrect = true;
                    marksAwarded = questionMarks;
                    totalScore += marksAwarded;
                  }
                }
              }
            }
          }
        } else if (type === "theory" || type === "essay") {
          const stem = String((q as any).questionText || (q as any).question_text || (q as any).question || "");
          const correctRaw = (q as any).correctAnswer;
          const correct = Array.isArray(correctRaw)
            ? String(correctRaw.filter(Boolean).join("; "))
            : String(correctRaw || (q as any).explanation || "");
          const textResp = String(response.textResponse || "");
          const rawScore = await gradeTheoryAnswer(stem, textResp, correct, questionMarks, (q as any).rubric);
          marksAwarded = rawScore;
          totalScore += marksAwarded;
          isCorrect = marksAwarded >= Math.max(1, Math.round(questionMarks * 0.5)); // heuristic correctness for theory
        }
      } // else no response: marksAwarded stays 0, isCorrect false
 
      studentAnswers[questionId] = {
        questionId,
        selectedOptionText: response?.selectedOptionText || null,
        textResponse: response?.textResponse || null,
        isCorrect,
        marksAwarded,
        isAnswered,
      };
 
      if (topicId) {
        const agg = topicAggregate[topicId] || { score: 0, total: 0 };
        agg.total += questionMarks;
        agg.score += marksAwarded;
        topicAggregate[topicId] = agg;
      }
    }

    const percentage = totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0;

    await attemptRef.update({
      status: "completed",
      submittedAt: Timestamp.now(),
      score: totalScore,
      totalMarks: totalPossibleMarks,
      percentage,
      answers: studentAnswers,
      topicScores: topicAggregate,
    });

    return NextResponse.json({
      score: totalScore,
      totalMarks: totalPossibleMarks,
      percentage,
      message: "Exam submitted successfully",
    });
  } catch (error) {
    console.error("[Firebase] Error submitting exam:", error);
    return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
  }
}

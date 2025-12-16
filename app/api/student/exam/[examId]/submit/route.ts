import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { gradeTheoryAnswer } from "@/lib/ai-service";

const OBJ_MARK = 2;
const THEORY_MARK = 6;

export async function POST(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId, responses } = await request.json();
    const studentId = decoded.userId;
    const examId = params.examId;

    const attemptRef = firestore.collection("exam_attempts").doc(attemptId);
    const attemptSnap = await attemptRef.get();

    if (!attemptSnap.exists) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    let score = 0;
    let totalMarks = 0;
    const answers: Record<string, any> = {};

    for (const res of responses) {
      const qSnap = await firestore.collection("questions").doc(res.questionId).get();
      if (!qSnap.exists) continue;

      const q = qSnap.data()!;
      const type = String(q.questionType || q.type || "mcq").toLowerCase();

      // Get question marks from exam attempt data or question data
      let questionMarks = OBJ_MARK; // default fallback
      if (type === "mcq" || type === "true_false") {
        questionMarks = OBJ_MARK;
      } else if (type === "theory" || type === "essay") {
        questionMarks = THEORY_MARK;
      }

      // Check if we can get actual marks from exam question data
      try {
        const examDoc = await firestore.collection("exams").doc(examId).get();
        if (examDoc.exists) {
          const examQuestionsSnap = await firestore
            .collection("exams")
            .doc(examId)
            .collection("questions")
            .where("questionId", "==", res.questionId)
            .get();

          if (!examQuestionsSnap.empty) {
            const examQData = examQuestionsSnap.docs[0].data();
            if (typeof examQData.marks === "number") {
              questionMarks = examQData.marks;
            }
          }
        }
      } catch (err) {
        // Fallback to default marks if lookup fails
        console.warn("Could not get question marks from exam data:", err);
      }

      let marksAwarded = 0;

      if (type === "mcq" || type === "true_false") {
        totalMarks += questionMarks;

        const opts = await firestore
          .collection("questions")
          .doc(res.questionId)
          .collection("options")
          .get();

        const correct = opts.docs.find(d => d.data().isCorrect === true);
        if (
          correct &&
          (res.selectedOptionId === correct.id ||
            res.selectedOptionText?.toLowerCase() ===
              correct.data().optionText?.toLowerCase())
        ) {
          marksAwarded = questionMarks;
        }
      }

      if (type === "theory" || type === "essay") {
        totalMarks += questionMarks;

        const modelAnswer = Array.isArray(q.correctAnswer)
          ? q.correctAnswer.join("; ")
          : q.correctAnswer || "";

        const raw = await gradeTheoryAnswer(
          q.questionText,
          res.textResponse || "",
          modelAnswer,
          questionMarks,
          q.rubric || null
        );

        // Clamp between 0 and questionMarks
        marksAwarded = Math.max(0, Math.min(questionMarks, raw));
      }

      score += marksAwarded;

      answers[res.questionId] = {
        marksAwarded,
        questionMarks,
        studentAnswer: res.textResponse || res.selectedOptionText || null,
      };
    }

    const percentage = Math.round((score / totalMarks) * 100);

    await attemptRef.update({
      status: "pending_review",
      adminReviewed: false,
      published: false,
      submittedAt: Timestamp.now(),
      score,
      totalMarks,
      percentage,
      answers,
    });

    return NextResponse.json({
      status: "pending_review",
      score,
      totalMarks,
      percentage,
      message: "Submission received. Your results will be available after admin review.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

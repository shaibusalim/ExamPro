import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

export async function POST(request: NextRequest, { params }: { params: { examId: string } }) {
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
    const examId = params.examId;
    const studentId = decoded.userId;

    // 1. Get exam attempt
    const attemptRef = doc(db, "exam_attempts", attemptId);
    const attemptDoc = await getDoc(attemptRef);

    if (!attemptDoc.exists() || attemptDoc.data().studentId !== studentId || attemptDoc.data().examId !== examId) {
      return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
    }

    const attemptData = attemptDoc.data();
    if (attemptData.status === "completed") {
      return NextResponse.json({ error: "Exam already submitted" }, { status: 400 });
    }

    let totalScore = 0;
    let totalPossibleMarks = 0;
    const studentAnswers: { [questionId: string]: any } = {};

    for (const response of responses) {
      const questionId = response.questionId;
      const questionRef = doc(db, "questions", questionId);
      const questionDoc = await getDoc(questionRef);

      if (!questionDoc.exists()) {
        console.warn(`Question ${questionId} not found during grading.`);
        continue;
      }

      const q = questionDoc.data();
      let isCorrect = false;
      let marksAwarded = 0;
      const questionMarks = q.marks || 1; // Default to 1 mark if not specified

      totalPossibleMarks += questionMarks;

      if (q.questionType === "MCQ" || q.questionType === "True/False") {
        const optionsRef = collection(db, "questions", questionId, "options");
        const optionsQuery = query(optionsRef, where("optionText", "==", response.selectedOptionText)); // Assuming selectedOptionText is sent
        const optionsSnapshot = await getDocs(optionsQuery);

        if (!optionsSnapshot.empty) {
          const selectedOption = optionsSnapshot.docs[0].data();
          if (selectedOption.isCorrect) {
            isCorrect = true;
            marksAwarded = questionMarks; // Award full marks for correct MCQ/TrueFalse
            totalScore += marksAwarded;
          }
        }
      } else if (q.questionType === "Theory") {
        // For theory questions, marksAwarded is 0 by default, can be graded manually later
        // Or implement AI grading if desired. For now, it's 0.
        marksAwarded = 0;
        // Optionally, store the text response for later manual grading
      }

      studentAnswers[questionId] = {
        questionId,
        selectedOptionText: response.selectedOptionText || null, // Or selectedOptionId
        textResponse: response.textResponse || null,
        isCorrect,
        marksAwarded,
        isAnswered: true,
      };
    }

    const percentage = totalPossibleMarks > 0 ? Math.round((totalScore / totalPossibleMarks) * 100) : 0;

    // Update exam attempt with score and answers
    await updateDoc(attemptRef, {
      status: "completed",
      submittedAt: serverTimestamp(),
      score: totalScore,
      totalMarks: totalPossibleMarks, // Total possible marks for the exam
      percentage,
      answers: studentAnswers, // Store all student responses
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

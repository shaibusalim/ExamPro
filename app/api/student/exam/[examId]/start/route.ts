import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

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

    const { examId } = await context.params;
    const studentId = decoded.userId;

    // 1. Check if exam exists and get its classId
    const examDoc = await firestore.collection("exams").doc(examId).get();
    if (!examDoc.exists) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }
    const examData = examDoc.data() as any;
    const classId = examData?.classId;

    if (!classId) {
      return NextResponse.json({ error: "Exam is not associated with a class" }, { status: 404 });
    }

    // 2. Check if student is enrolled in the class
    const enrollmentSnapshot = await firestore
      .collection("enrollments")
      .where("classId", "==", classId)
      .where("studentId", "==", studentId)
      .get();

    if (enrollmentSnapshot.empty) {
      const userDoc = await firestore.collection("users").doc(studentId).get();
      const userData = userDoc.exists ? (userDoc.data() as any) : null;
      const classDoc = await firestore.collection("classes").doc(classId).get();
      const classData = classDoc.exists ? (classDoc.data() as any) : null;
      if (!userData || !classData || userData.classLevel !== classData.level) {
        return NextResponse.json({ error: "Student not enrolled in this class for the exam" }, { status: 403 });
      }
    }

    if (examData.locked || !["published", "active"].includes(String(examData.status || "draft"))) {
      return NextResponse.json({ error: "Exam locked or not available" }, { status: 403 });
    }

    // 3. Create or update exam attempt
    let attemptId: string;
    let startedAt: Timestamp | null = null;

    const attemptSnapshot = await firestore
      .collection("exam_attempts")
      .where("examId", "==", examId)
      .where("studentId", "==", studentId)
      .get();

    if (!attemptSnapshot.empty) {
      // Attempt exists, update it
      const existingAttemptDoc = attemptSnapshot.docs[0];
      attemptId = existingAttemptDoc.id;
      startedAt = existingAttemptDoc.data().startedAt as Timestamp | null;

      await existingAttemptDoc.ref.update({
        status: "in_progress",
        updatedAt: Timestamp.now(),
      });
      const existingSelected = existingAttemptDoc.data().selectedQuestionIds as string[] | undefined;
      var selectedQuestionIds = Array.isArray(existingSelected) ? existingSelected : undefined;
    } else {
      // No attempt, create a new one
      const newAttempt = {
        examId,
        studentId,
        status: "in_progress",
        startedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        submittedAt: null,
        score: null,
        answers: {}, // Initialize an empty object for answers
      };
      const newAttemptRef = await firestore.collection("exam_attempts").add(newAttempt);
      attemptId = newAttemptRef.id;
      startedAt = newAttempt.startedAt as Timestamp;
      var selectedQuestionIds: string[] | undefined = undefined;
    }

    function seededShuffle<T>(arr: T[], seed: number) {
      const a = arr.slice();
      let s = seed;
      for (let i = a.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const r = s / 233280;
        const j = Math.floor(r * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    }
    function strSeed(...parts: string[]) {
      const s = parts.join("");
      return Array.from(s).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    }

    // 4. Get exam questions with full details and options
    const examQuestionsSnapshot = await firestore
      .collection("exams")
      .doc(examId)
      .collection("questions")
      .orderBy("orderNumber")
      .get();

    const allQuestionIds = examQuestionsSnapshot.docs
      .map((d) => ((d.data() as any).questionId as string) || d.id)
      .filter(Boolean) as string[];
    const poolSize = typeof examData.poolSize === "number" ? Math.max(1, examData.poolSize) : 40;
    const shuffleQuestions = typeof examData.shuffleQuestions === "boolean" ? examData.shuffleQuestions : true;
    const versionCount = typeof examData.versionCount === "number" ? Math.max(1, examData.versionCount) : 1;
    const versionIndex = versionCount > 1 ? (strSeed(String(studentId || ""), String(examId || "")) % versionCount) : 0;
    if (!selectedQuestionIds || selectedQuestionIds.length === 0) {
      let orderedIds = allQuestionIds;
      if (shuffleQuestions) {
        const seed = strSeed(String(examId || ""), String(versionIndex), String(attemptId || ""));
        orderedIds = seededShuffle(allQuestionIds, seed);
      } else if (versionCount > 1) {
        const seed = strSeed(String(examId || ""), String(versionIndex));
        orderedIds = seededShuffle(allQuestionIds, seed);
      }
      selectedQuestionIds = orderedIds.slice(0, Math.min(poolSize, orderedIds.length));
      await firestore.collection("exam_attempts").doc(attemptId).update({ selectedQuestionIds, versionIndex });
    }

    const questionsWithDetails = await Promise.all(
      examQuestionsSnapshot.docs.map(async (examQuestionDoc) => {
      const eqData = examQuestionDoc.data() as any;
      const questionId = eqData.questionId;
      if (!selectedQuestionIds?.includes(questionId)) {
        return null;
      }

      const qTopDoc = await firestore.collection("questions").doc(questionId).get();
      let fullQuestionData: any;
      if (qTopDoc.exists) {
        fullQuestionData = qTopDoc.data() as any;
      } else {
        fullQuestionData = eqData;
      }
      let options: any[] = [];
      const qTypeRaw = String(fullQuestionData.questionType || fullQuestionData.type || fullQuestionData.question_type || "").toLowerCase();
      if (["mcq", "true_false"].includes(qTypeRaw)) {
        const optSnap = await firestore.collection("questions").doc(questionId).collection("options").orderBy("optionOrder").get();
        options = optSnap.docs.map((d) => {
          const ov = d.data() as any;
          return { id: d.id, text: ov.optionText, isCorrect: !!ov.isCorrect };
        });
        const shuffleOptions = typeof examData.shuffleOptions === "boolean" ? examData.shuffleOptions : true;
        if (shuffleOptions) {
          const optSeed = strSeed(String(attemptId || ""), String(questionId || ""));
          options = seededShuffle(options, optSeed);
        }
      } else if (Array.isArray(fullQuestionData.options) && fullQuestionData.options.length > 0) {
        const texts = fullQuestionData.options.map((text: any) => ({ id: String(text), text }));
        const shuffleOptions = typeof examData.shuffleOptions === "boolean" ? examData.shuffleOptions : true;
        if (shuffleOptions) {
          const optSeed = strSeed(String(attemptId || ""), String(questionId || ""));
          options = seededShuffle(texts, optSeed);
        } else {
          options = texts;
        }
      }

        const typeMap: Record<string, string> = {
          mcq: "mcq",
          MCQ: "mcq",
          "true_false": "true_false",
          "True/False": "true_false",
          essay: "essay",
          theory: "essay",
        };

        return {
          id: String(questionId),
          examQuestionId: examQuestionDoc.id,
          marks: eqData.marks || fullQuestionData.marks || 1,
          question_text: fullQuestionData.questionText || fullQuestionData.question || fullQuestionData.question_text || "",
          question_type: typeMap[String(fullQuestionData.questionType || fullQuestionData.type || fullQuestionData.question_type || "mcq")] || "mcq",
          options,
        };
      })
    );

    // Filter out any null questions if they weren't found
    const questions = questionsWithDetails.filter(q => q !== null);
    if (!questions.length) {
      return NextResponse.json({ error: "No questions available for this exam" }, { status: 404 });
    }

    return NextResponse.json({
      attemptId,
      startedAt: startedAt ? (startedAt as any).toDate().toISOString() : new Date().toISOString(),
      duration_minutes: Number(examData.durationMinutes || 60),
      questions,
      questionLocking: !!examData.questionLocking,
      versionIndex,
    });
  } catch (error) {
    console.error("[Firebase] Error starting exam:", error);
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }
}

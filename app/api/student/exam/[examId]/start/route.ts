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
      .get();

    const allQuestionIds = examQuestionsSnapshot.docs
      .map((d) => ((d.data() as any).questionId as string) || d.id)
      .filter(Boolean) as string[];
    const poolSize = typeof examData.poolSize === "number" ? Math.max(1, examData.poolSize) : 40;
    const shuffleQuestions = typeof examData.shuffleQuestions === "boolean" ? examData.shuffleQuestions : true;
    const versionCount = typeof examData.versionCount === "number" ? Math.max(1, examData.versionCount) : 1;
    const versionIndex = versionCount > 1 ? (strSeed(String(studentId || ""), String(examId || "")) % versionCount) : 0;
    if (!selectedQuestionIds || selectedQuestionIds.length === 0) {
    const typed: Array<{ id: string; type: "objective" | "theory" }> = [];
    for (const d of examQuestionsSnapshot.docs) {
      const eq = d.data() as any;
      const qid = ((eq.questionId as string) || d.id);
      if (!qid) continue;
      let tRaw = String(eq.questionType || eq.type || "").toLowerCase();
      if (!tRaw) {
        const qTop = await firestore.collection("questions").doc(qid).get();
        if (qTop.exists) {
          const qd = qTop.data() as any;
          tRaw = String(qd.questionType || qd.type || qd.question_type || "").toLowerCase();
        }
      }
      const tNorm = (tRaw === "mcq" || tRaw === "true_false") ? "objective" : ((tRaw === "essay" || tRaw === "theory") ? "theory" : "objective");
      typed.push({ id: qid, type: tNorm });
    }
      let objIds = typed.filter(t => t.type === "objective").map(t => t.id);
      let thyIds = typed.filter(t => t.type === "theory").map(t => t.id);
      if (shuffleQuestions) {
        const seedObj = strSeed(String(examId || ""), "obj", String(versionIndex), String(attemptId || ""));
        const seedThy = strSeed(String(examId || ""), "thy", String(versionIndex), String(attemptId || ""));
        objIds = seededShuffle(objIds, seedObj);
        thyIds = seededShuffle(thyIds, seedThy);
      }
      const needObj = 35;
      const needThy = 5;
      if (objIds.length < needObj || thyIds.length < needThy) {
        return NextResponse.json({ error: "Exam does not have required objective/theory distribution" }, { status: 400 });
      }
      const chosen = [...objIds.slice(0, needObj), ...thyIds.slice(0, needThy)];
      selectedQuestionIds = chosen.slice(0, Math.min(poolSize, chosen.length));
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

        const qt = typeMap[String(fullQuestionData.questionType || fullQuestionData.type || fullQuestionData.question_type || "mcq")] || "mcq";
        const fallbackMarks = qt === "mcq" || qt === "true_false" ? 2 : (qt === "essay" ? 6 : 1);
        const marksOut = typeof eqData.marks === "number" ? eqData.marks : (typeof fullQuestionData.marks === "number" ? fullQuestionData.marks : fallbackMarks);
        return {
          id: String(questionId),
          examQuestionId: examQuestionDoc.id,
          marks: marksOut,
          question_text: fullQuestionData.questionText || fullQuestionData.question || fullQuestionData.question_text || "",
          question_type: qt,
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

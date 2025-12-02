import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
  orderBy
} from "firebase/firestore";

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

    const examId = params.examId;
    const studentId = decoded.userId;

    // 1. Check if exam exists and get its classId
    const examRef = doc(db, "exams", examId);
    const examDoc = await getDoc(examRef);

    if (!examDoc.exists()) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }
    const examData = examDoc.data();
    const classId = examData?.classId;

    if (!classId) {
      return NextResponse.json({ error: "Exam is not associated with a class" }, { status: 404 });
    }

    // 2. Check if student is enrolled in the class
    const enrollmentsRef = collection(db, "enrollments");
    const enrollmentQuery = query(
      enrollmentsRef,
      where("classId", "==", classId),
      where("studentId", "==", studentId)
    );
    const enrollmentSnapshot = await getDocs(enrollmentQuery);

    if (enrollmentSnapshot.empty) {
      return NextResponse.json({ error: "Student not enrolled in this class for the exam" }, { status: 403 });
    }

    // 3. Create or update exam attempt
    let attemptId: string;
    let startedAt: Timestamp | null = null;

    const attemptQuery = query(
      collection(db, "exam_attempts"),
      where("examId", "==", examId),
      where("studentId", "==", studentId)
    );
    const attemptSnapshot = await getDocs(attemptQuery);

    if (!attemptSnapshot.empty) {
      // Attempt exists, update it
      const existingAttemptDoc = attemptSnapshot.docs[0];
      attemptId = existingAttemptDoc.id;
      startedAt = existingAttemptDoc.data().startedAt;

      await updateDoc(doc(db, "exam_attempts", attemptId), {
        status: "in_progress",
        updatedAt: serverTimestamp(),
      });
    } else {
      // No attempt, create a new one
      const newAttempt = {
        examId,
        studentId,
        status: "in_progress",
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: null,
        score: null,
        answers: {}, // Initialize an empty object for answers
      };
      const newAttemptRef = await addDoc(collection(db, "exam_attempts"), newAttempt);
      attemptId = newAttemptRef.id;
      startedAt = newAttempt.startedAt as Timestamp; // Cast to Timestamp as serverTimestamp() returns a special value
    }

    // 4. Get exam questions with full details and options
    const examQuestionsRef = collection(db, "exams", examId, "questions");
    const examQuestionsQuery = query(examQuestionsRef, orderBy("orderNumber"));
    const examQuestionsSnapshot = await getDocs(examQuestionsQuery);

    const questionsWithDetails = await Promise.all(
      examQuestionsSnapshot.docs.map(async (examQuestionDoc) => {
        const eqData = examQuestionDoc.data();
        const questionId = eqData.questionId;

        const questionRef = doc(db, "questions", questionId);
        const questionDoc = await getDoc(questionRef);

        if (!questionDoc.exists()) {
          console.warn(`Question ${questionId} not found in top-level questions collection.`);
          return null;
        }

        const fullQuestionData = questionDoc.data();
        let options: any[] = [];

        if (["MCQ", "True/False"].includes(fullQuestionData.questionType)) {
          const optionsRef = collection(db, "questions", questionId, "options");
          const optionsSnapshot = await getDocs(optionsRef);
          options = optionsSnapshot.docs.map(optionDoc => ({
            id: optionDoc.id,
            ...optionDoc.data(),
          }));
        }

        return {
          id: questionDoc.id,
          examQuestionId: examQuestionDoc.id, // ID of the question in the exam's subcollection
          marks: eqData.marks, // Marks specific to this exam's question
          ...fullQuestionData,
          options,
        };
      })
    );

    // Filter out any null questions if they weren't found
    const questions = questionsWithDetails.filter(q => q !== null);

    return NextResponse.json({
      attemptId,
      startedAt: startedAt ? startedAt.toDate().toISOString() : new Date().toISOString(), // Convert Timestamp to ISO string
      questions,
    });
  } catch (error) {
    console.error("[Firebase] Error starting exam:", error);
    return NextResponse.json({ error: "Failed to start exam" }, { status: 500 });
  }
}

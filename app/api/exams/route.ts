import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, getDoc, orderBy, writeBatch } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const examsRef = collection(db, "exams");
    const q = query(examsRef, where("createdBy", "==", decoded.userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const exams = await Promise.all(querySnapshot.docs.map(async (examDoc) => {
      const examData = examDoc.data();
      const classId = examData.classId;

      // Fetch class name and level
      let className = null;
      let classLevel = null;
      if (classId) {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (classDoc.exists()) {
          const classData = classDoc.data();
          className = classData.name || null;
          classLevel = classData.level || null; // Ensure it's explicitly null if not present
        }
      }

      // Count total attempts
      const examAttemptsRef = collection(db, "exam_attempts");
      const attemptsQuery = query(examAttemptsRef, where("examId", "==", examDoc.id));
      const attemptsSnapshot = await getDocs(attemptsQuery);
      const total_attempts = attemptsSnapshot.size;

      return {
        id: examDoc.id,
        ...examData,
        class_name: className,
        level: classLevel || "", // Ensure 'level' is always a string
        total_attempts,
      };
    }));

    return NextResponse.json(exams);
  } catch (error) {
    console.error("[Firebase] Error fetching exams:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { classId, title, description, durationMinutes, totalMarks, passingMarks, questions } = await request.json();

    // Create exam
    const newExam = {
      classId,
      title,
      description: description || null,
      durationMinutes: durationMinutes || 0,
      totalMarks: totalMarks || 0,
      passingMarks: passingMarks || 0,
      createdBy: decoded.userId,
      status: "draft", // default status
      createdAt: new Date().toISOString(),
    };

    const examDocRef = await addDoc(collection(db, "exams"), newExam);
    const examId = examDocRef.id;

    // Add questions to exam as a subcollection
    if (questions && Array.isArray(questions)) {
      const batch = writeBatch(db); // Use a batch for multiple writes
      questions.forEach((question, index) => {
        const questionRef = doc(collection(db, "exams", examId, "questions")); // Subcollection
        batch.set(questionRef, {
          questionId: question.id,
          orderNumber: index + 1,
          marks: question.marks || 1,
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ id: examId, ...newExam, message: "Exam created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating exam:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}

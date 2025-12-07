import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
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

    if (!decoded || decoded.role !== "admin") {
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

    const examDocRef = await firestore.collection("exams").add(newExam);
    const examId = examDocRef.id;

    if (questions && Array.isArray(questions)) {
      const batch = firestore.batch();
      questions.forEach((question, index) => {
        const questionRef = firestore.collection("exams").doc(examId).collection("questions").doc();
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

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId, status } = await request.json();
    const allowed = ["draft", "published", "active", "closed"];
    if (!examId || !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid examId or status" }, { status: 400 });
    }

    await firestore.collection("exams").doc(examId).update({ status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Firebase] Error updating exam status:", error);
    return NextResponse.json({ error: "Failed to update exam status" }, { status: 500 });
  }
}

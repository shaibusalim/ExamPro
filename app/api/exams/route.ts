import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
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

    const querySnapshot = await firestore
      .collection("exams")
      .where("createdBy", "==", decoded.userId)
      .orderBy("createdAt", "desc")
      .get();

    const exams = await Promise.all(querySnapshot.docs.map(async (examDoc) => {
      const examData = examDoc.data() as any;
      const classId = examData.classId;

      let className: string | null = null;
      let classLevel: string | null = null;
      if (classId) {
        const classDoc = await firestore.collection("classes").doc(String(classId)).get();
        if (classDoc.exists) {
          const classData = classDoc.data() as any;
          className = classData.name || null;
          classLevel = classData.level || null;
        }
      }

      const attemptsSnapshot = await firestore
        .collection("exam_attempts")
        .where("examId", "==", examDoc.id)
        .get();
      const total_attempts = attemptsSnapshot.size;

      return {
        id: examDoc.id,
        ...examData,
        class_name: className,
        level: classLevel || "",
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

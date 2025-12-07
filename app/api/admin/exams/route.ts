import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth"; // Using verifyToken from common auth
import { firestore } from "@/lib/firebaseAdmin"; // Assuming firebaseAdmin is properly initialized

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const snapshot = await firestore
      .collection("exams")
      .where("createdBy", "==", decoded.userId)
      .orderBy("createdAt", "desc")
      .get();

    const out: any[] = [];
    for (const d of snapshot.docs) {
      const exam = d.data() as any;
      const questionsSnap = await firestore.collection("exams").doc(d.id).collection("questions").get();
      const questionsCount = questionsSnap.size;
      let topic = "General";
      if (!questionsSnap.empty) {
        const firstQ = questionsSnap.docs[0].data() as any;
        const qId = firstQ.questionId;
        if (qId) {
          const qDoc = await firestore.collection("questions").doc(qId).get();
          if (qDoc.exists) {
            const qData = qDoc.data() as any;
            const topicId = qData.topicId;
            if (topicId) {
              const tDoc = await firestore.collection("topics").doc(topicId).get();
              if (tDoc.exists) {
                topic = (tDoc.data() as any).title || topic;
              }
            }
          }
        }
      }
      out.push({
        id: d.id,
        title: exam.title || "Untitled",
        topic,
        questionsCount,
        locked: !!exam.locked,
        status: exam.status || "draft",
        createdAt: typeof exam.createdAt === "string" ? exam.createdAt : (exam.createdAt?.toISOString?.() || new Date().toISOString()),
      });
    }

    return NextResponse.json(out);
  } catch (err) {
    console.error("[API/Admin/Exams] GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { classId, title, description, durationMinutes, totalMarks, passingMarks, questions } = await request.json();

    if (!classId || !title || !questions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create exam document
    const examRef = await firestore.collection("exams").add({
      classId,
      title,
      description,
      durationMinutes,
      totalMarks,
      passingMarks,
      createdAt: new Date(),
    });

    // Fetch question details from question bank
    const questionBankRef = firestore.collection("question_banks").doc(classId);
    const questionBankDoc = await questionBankRef.get();
    const questionBank = questionBankDoc.exists ? questionBankDoc.data() : null;

    if (!questionBank) {
      return NextResponse.json({ error: "Question bank not found for this class" }, { status: 400 });
    }

    // Flatten all questions
    const allQuestions = [
      ...(questionBank.objectives || []).map((q: any) => ({ ...q, type: "objective" })),
      ...(questionBank.theory || []).map((q: any) => ({ ...q, type: "theory" })),
    ];

    // Store selected questions under exam
    const batch = firestore.batch();
    questions.forEach((q: { id: string; marks: number }) => {
      const questionData = allQuestions.find((aq) => aq.id === q.id);
      if (!questionData) return;
      const qRef = examRef.collection("questions").doc(q.id);
      batch.set(qRef, {
        ...questionData,
        marks: q.marks || questionData.marks || 1,
        type: questionData.type,
        imageUrl: questionData.imageUrl || null,
      });
    });

    await batch.commit();

    return NextResponse.json({ message: "Exam created", examId: examRef.id }, { status: 201 });
  } catch (err) {
    console.error("[API/Admin/Exams] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

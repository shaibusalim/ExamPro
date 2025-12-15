import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Student/Exams] Request received."); // Debugging
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Student/Exams] Unauthorized: No auth header."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Student/Exams] Token extracted, verifying..."); // Debugging
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "student") {
      console.log("[API/Student/Exams] Unauthorized: Token verification failed or not a student."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = decoded.userId;

    const userDoc = await firestore.collection("users").doc(studentId).get();
    const userData = userDoc.exists ? (userDoc.data() as any) : null;
    if (userData?.lockedDashboard) {
      return NextResponse.json({ error: "Dashboard locked" }, { status: 403 });
    }
    if (userData?.lockedExams) {
      return NextResponse.json({ error: "Exams locked" }, { status: 403 });
    }
    console.log("[API/Student/Exams] Student ID:", studentId); // Debugging

    // 1. Get all classes the student is enrolled in
    const enrollmentSnapshot = await firestore
      .collection("enrollments")
      .where("studentId", "==", studentId)
      .get();

    let enrolledClassIds = enrollmentSnapshot.docs.map(doc => doc.data().classId);

    if (enrollmentSnapshot.empty) {
      const studentClassLevel = userData?.classLevel;
      if (studentClassLevel) {
        const classesSnapshot = await firestore
          .collection("classes")
          .where("level", "==", studentClassLevel)
          .get();
        enrolledClassIds = classesSnapshot.docs.map(d => d.id);
      }
      if (!enrolledClassIds || enrolledClassIds.length === 0) {
        return NextResponse.json([]);
      }
    }

    // 2. Fetch exams for these enrolled classes that are published or active
    // Firestore 'in' query supports up to 10 classIds. If more, multiple queries are needed.
    const examsSnapshot = await firestore
      .collection("exams")
      .where("classId", "in", enrolledClassIds.slice(0, 10))
      .where("status", "in", ["published", "active"])
      .get();

    const exams = await Promise.all(examsSnapshot.docs.map(async (examDoc) => {
      const examData = examDoc.data();
      if (examData.locked === true) {
        return null;
      }
      const classId = examData.classId;

      // Fetch class name
      let className = null;
      if (classId) {
        const classDoc = await firestore.collection("classes").doc(classId).get();
        if (classDoc.exists) {
          className = (classDoc.data() as any)?.name || null;
        }
      }

      // Get student's attempt for this exam (if any)
      let attemptId = null;
      let score = null;
      let status: string | null = null;
      let attemptTotalMarks: number | null = null;
      let attemptPercentage: number | null = null;
      let attemptSubmittedAt: string | null = null;
      const attemptSnapshot = await firestore
        .collection("exam_attempts")
        .where("examId", "==", examDoc.id)
        .where("studentId", "==", studentId)
        .get();

      if (!attemptSnapshot.empty) {
        const attemptData = attemptSnapshot.docs[0].data() as any;
        attemptId = attemptSnapshot.docs[0].id;
        score = attemptData.score ?? null;
        status = String(attemptData.status || "");
        attemptTotalMarks = typeof attemptData.totalMarks === 'number' ? attemptData.totalMarks : null;
        attemptPercentage = typeof attemptData.percentage === 'number' ? attemptData.percentage : null;
        attemptSubmittedAt = attemptData.submittedAt ? String((attemptData.submittedAt as any).toDate?.() || attemptData.submittedAt) : null;
      }

      return {
        id: examDoc.id,
        title: examData.title || "Exam",
        class_name: className,
        duration_minutes: Number((examData as any).durationMinutes || (examData as any).duration_minutes || 60),
        total_marks: Number((examData as any).totalMarks || (examData as any).total_marks || 0),
        attempt_id: status === "completed" ? attemptId : null,
        score: status === "completed" ? score : null,
        status: status || null,
        attempt_total_marks: status === "completed" ? attemptTotalMarks : null,
        attempt_percentage: status === "completed" ? attemptPercentage : null,
        attempt_submitted_at: status === "completed" ? attemptSubmittedAt : null,
      };
    }));

    const filtered = (exams.filter(Boolean) as any[]).sort((a, b) => {
      const aT = Number(new Date(String((a as any).createdAt || 0)).getTime());
      const bT = Number(new Date(String((b as any).createdAt || 0)).getTime());
      return bT - aT;
    });
    console.log("[API/Student/Exams] Fetched exams:", filtered.length); // Debugging
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("[Firebase] Error fetching student exams:", error);
    return NextResponse.json([]);
  }
}

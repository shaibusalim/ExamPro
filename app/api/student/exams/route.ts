import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "firebase/firestore";

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
    console.log("[API/Student/Exams] Student ID:", studentId); // Debugging

    // 1. Get all classes the student is enrolled in
    const enrollmentsRef = collection(db, "enrollments");
    const enrollmentQuery = query(enrollmentsRef, where("studentId", "==", studentId));
    const enrollmentSnapshot = await getDocs(enrollmentQuery);

    if (enrollmentSnapshot.empty) {
      return NextResponse.json([]); // No enrolled classes, no exams
    }

    const enrolledClassIds = enrollmentSnapshot.docs.map(doc => doc.data().classId);

    // 2. Fetch exams for these enrolled classes that are published or active
    // Firestore 'in' query supports up to 10 classIds. If more, multiple queries are needed.
    const examsRef = collection(db, "exams");
    let examsQuery = query(
      examsRef,
      where("classId", "in", enrolledClassIds.slice(0, 10)), // Handle up to 10 classIds
      where("status", "in", ["published", "active"]),
      orderBy("createdAt", "desc")
    );

    const examsSnapshot = await getDocs(examsQuery);

    const exams = await Promise.all(examsSnapshot.docs.map(async (examDoc) => {
      const examData = examDoc.data();
      const classId = examData.classId;

      // Fetch class name
      let className = null;
      if (classId) {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (classDoc.exists()) {
          className = classDoc.data().name;
        }
      }

      // Get student's attempt for this exam (if any)
      let attemptId = null;
      let score = null;
      const attemptQuery = query(
        collection(db, "exam_attempts"),
        where("examId", "==", examDoc.id),
        where("studentId", "==", studentId)
      );
      const attemptSnapshot = await getDocs(attemptQuery);

      if (!attemptSnapshot.empty) {
        const attemptData = attemptSnapshot.docs[0].data();
        attemptId = attemptSnapshot.docs[0].id;
        score = attemptData.score;
      }

      return {
        id: examDoc.id,
        ...examData,
        class_name: className,
        attempt_id: attemptId,
        score: score,
      };
    }));

    console.log("[API/Student/Exams] Fetched exams:", exams.length); // Debugging
    return NextResponse.json(exams);
  } catch (error) {
    console.error("[Firebase] Error fetching student exams:", error);
    return NextResponse.json({ error: "Failed to fetch student exams" }, { status: 500 });
  }
}

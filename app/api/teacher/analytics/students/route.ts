import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

interface StudentPerformance {
  id: string;
  fullName: string;
  email: string;
  class_id: string;
  class_name: string;
  class_level: string;
  total_exams_attempted: number;
  average_score: number;
}

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

    const teacherId = decoded.userId;
    const studentsPerformance: StudentPerformance[] = [];

    // 1. Get all classes created by this teacher
    const classesRef = collection(db, "classes");
    const classesQuery = query(classesRef, where("teacherId", "==", teacherId));
    const classesSnapshot = await getDocs(classesQuery);

    if (classesSnapshot.empty) {
      return NextResponse.json([]); // No classes for this teacher
    }

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const classId = classDoc.id;
      const className = classData.name;
      const classLevel = classData.level;

      // 2. Get all enrollments for this class
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentsQuery = query(enrollmentsRef, where("classId", "==", classId));
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      if (enrollmentsSnapshot.empty) {
        continue; // No students in this class
      }

      for (const enrollmentDoc of enrollmentsSnapshot.docs) {
        const studentId = enrollmentDoc.data().studentId;

        // 3. Get student's user profile
        const userDocRef = doc(db, "users", studentId);
        const userDocSnap = await getDoc(userDocRef);
        
        let fullName = "Unknown Student";
        let email = "unknown@example.com";
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          fullName = userData.fullName || fullName;
          email = userData.email || email;
        }

        // 4. Calculate student's performance (average score) across all exams in this class
        const examAttemptsRef = collection(db, "exam_attempts");
        const studentAttemptsQuery = query(
          examAttemptsRef,
          where("studentId", "==", studentId),
          where("classId", "==", classId) // Assuming exam_attempts also store classId
        );
        const attemptsSnapshot = await getDocs(studentAttemptsQuery);

        let totalScore = 0;
        let attemptedExamsCount = 0;

        attemptsSnapshot.docs.forEach(attemptDoc => {
          const attemptData = attemptDoc.data();
          if (attemptData.score !== undefined && attemptData.score !== null) {
            totalScore += attemptData.score;
            attemptedExamsCount++;
          }
        });

        const averageScore = attemptedExamsCount > 0 ? totalScore / attemptedExamsCount : 0;

        studentsPerformance.push({
          id: studentId,
          fullName,
          email,
          class_id: classId,
          class_name: className,
          class_level: classLevel,
          total_exams_attempted: attemptedExamsCount,
          average_score: parseFloat(averageScore.toFixed(2)),
        });
      }
    }

    return NextResponse.json(studentsPerformance);
  } catch (error) {
    console.error("[Firebase] Error fetching student performance:", error);
    return NextResponse.json({ error: "Failed to fetch student performance" }, { status: 500 });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

interface StudentPerformance {
  studentId: string;
  fullName: string;
  email: string;
  totalExamsAttempted: number;
  averageScore: number;
  lockedDashboard: boolean;
  lockedExams: boolean;
}

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

    const studentsPerformance: StudentPerformance[] = [];

    // 1. Fetch all students (users with role 'student')
    const studentsSnapshot = await firestore.collection("users").where("role", "==", "student").get();

    if (studentsSnapshot.empty) {
      return NextResponse.json([]); // No students found
    }

    // Prepare to fetch all exam attempts for all students efficiently
    const studentIds = studentsSnapshot.docs.map(doc => doc.id);
    let allAttempts: any[] = [];

    if (studentIds.length > 0) {
        const attemptsRef = firestore.collection("exam_attempts");
        const attemptQueries = [];
        // Firestore 'in' query limit is 10. Handle multiple queries if needed.
        for (let i = 0; i < studentIds.length; i += 10) {
            const batchIds = studentIds.slice(i, i + 10);
            attemptQueries.push(attemptsRef.where("studentId", "in", batchIds).where("status", "==", "completed"));
        }
        const attemptSnapshots = await Promise.all(attemptQueries.map(q => q.get()));
        attemptSnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                allAttempts.push({ id: doc.id, ...doc.data() });
            });
        });
    }

    // Process student data and their attempts
    for (const userDoc of studentsSnapshot.docs) {
      const userData = userDoc.data();
      const studentId = userDoc.id;

      const studentAttempts = allAttempts.filter(attempt => attempt.studentId === studentId);

      let totalScore = 0;
      let attemptedExamsCount = 0;

      studentAttempts.forEach(attemptData => {
        if (attemptData.percentage !== undefined && attemptData.percentage !== null) {
          totalScore += attemptData.percentage;
          attemptedExamsCount++;
        }
      });

      const averageScore = attemptedExamsCount > 0 ? totalScore / attemptedExamsCount : 0;

      studentsPerformance.push({
        studentId: studentId,
        fullName: userData.fullName || "Unknown Student",
        email: userData.email || "unknown@example.com",
        totalExamsAttempted: attemptedExamsCount,
        averageScore: parseFloat(averageScore.toFixed(2)),
        lockedDashboard: !!userData.lockedDashboard,
        lockedExams: !!userData.lockedExams,
      });
    }

    // Sort students by average score (highest first) for the analytics page display
    studentsPerformance.sort((a, b) => b.averageScore - a.averageScore);

    return NextResponse.json(studentsPerformance);
  } catch (error) {
    console.error("[Firebase] Error fetching all student performance for admin analytics:", error);
    return NextResponse.json({ error: "Failed to fetch student performance" }, { status: 500 });
  }
}

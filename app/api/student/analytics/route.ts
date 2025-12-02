import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Student/Analytics] Request received."); // Debugging
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Student/Analytics] Unauthorized: No auth header."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Student/Analytics] Token extracted, verifying..."); // Debugging
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "student") { // Ensure only students can access their analytics
      console.log("[API/Student/Analytics] Unauthorized: Token verification failed or not a student."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentId = decoded.userId;
    console.log("[API/Student/Analytics] Student ID:", studentId); // Debugging

    // Fetch all exam attempts for the student
    const examAttemptsRef = collection(db, "exam_attempts");
    const studentAttemptsQuery = query(examAttemptsRef, where("studentId", "==", studentId));
    const attemptsSnapshot = await getDocs(studentAttemptsQuery);

    let totalScoreSum = 0;
    let totalPossibleScoreSum = 0;
    let attemptedExamsCount = 0;

    const topicScores: { [topicId: string]: { score: number, total: number } } = {};

    for (const attemptDoc of attemptsSnapshot.docs) {
      const attemptData = attemptDoc.data();
      if (attemptData.score !== undefined && attemptData.total_marks !== undefined) {
        totalScoreSum += attemptData.score;
        totalPossibleScoreSum += attemptData.total_marks;
        attemptedExamsCount++;

        // For topic-level analysis, we'd need to fetch exam details to get topics per question.
        // This is a simplified approach, assuming we might not have direct topic scores in exam_attempts.
        // If 'attemptData.topicScores' existed, we would use it.
        // For now, let's just get overall performance.
      }
    }

    const overallAverageScore = attemptedExamsCount > 0 ? (totalScoreSum / totalPossibleScoreSum) * 100 : 0;
    
    // Placeholder for weaknesses and suggestions - more complex logic would go here
    const weaknesses = ["No detailed topic analysis available yet."];
    const suggestions = ["Continue practicing all subjects.", "Focus on understanding core concepts."];


    return NextResponse.json({
      overallAverageScore: parseFloat(overallAverageScore.toFixed(2)),
      totalExamsAttempted: attemptedExamsCount,
      weaknesses: weaknesses,
      suggestions: suggestions,
    });

  } catch (error) {
    console.error("[Firebase] Error fetching student analytics:", error);
    return NextResponse.json({ error: "Failed to fetch student analytics" }, { status: 500 });
  }
}

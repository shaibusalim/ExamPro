import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

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
    const userDoc = await firestore.collection("users").doc(studentId).get();
    const userData = userDoc.exists ? (userDoc.data() as any) : null;
    if (userData?.lockedDashboard) {
      return NextResponse.json({ error: "Dashboard locked" }, { status: 403 });
    }
    console.log("[API/Student/Analytics] Student ID:", studentId); // Debugging

    // Fetch all exam attempts for the student
    const attemptsSnapshot = await firestore
      .collection("exam_attempts")
      .where("studentId", "==", studentId)
      .get();

    let totalScoreSum = 0;
    let totalPossibleScoreSum = 0;
    let attemptedExamsCount = 0;

    const topicScores: { [topicId: string]: { score: number; total: number } } = {};

    for (const attemptDoc of attemptsSnapshot.docs) {
      const attemptData = attemptDoc.data() as any;
      if (typeof attemptData.score === "number" && typeof attemptData.totalMarks === "number") {
        totalScoreSum += attemptData.score;
        totalPossibleScoreSum += attemptData.totalMarks;
        attemptedExamsCount++;

        const ts = attemptData.topicScores as Record<string, { score: number; total: number }> | undefined;
        if (ts) {
          for (const [tid, vals] of Object.entries(ts)) {
            if (!tid) continue;
            const cur = topicScores[tid] || { score: 0, total: 0 };
            cur.score += Number(vals.score || 0);
            cur.total += Number(vals.total || 0);
            topicScores[tid] = cur;
          }
        } else if (attemptData.answers) {
          const answers = attemptData.answers as Record<string, any>;
          const qIds = Object.keys(answers);
          if (qIds.length > 0) {
            const fetches = qIds.map((qid) => firestore.collection("questions").doc(qid).get());
            const qDocs = await Promise.all(fetches);
            for (let i = 0; i < qDocs.length; i++) {
              const qDoc = qDocs[i];
              if (!qDoc.exists) continue;
              const qData = qDoc.data() as any;
              const tid = String(qData.topicId || "");
              if (!tid) continue;
              const ans = answers[qDoc.id];
              const questionMarks = Number(qData.marks || 1);
              const cur = topicScores[tid] || { score: 0, total: 0 };
              cur.total += questionMarks;
              cur.score += Number(ans?.marksAwarded || 0);
              topicScores[tid] = cur;
            }
          }
        }
      }
    }

    const overallAverageScore = totalPossibleScoreSum > 0 ? (totalScoreSum / totalPossibleScoreSum) * 100 : 0;

    const topicPercentages: { topicId: string; percentage: number }[] = [];
    for (const [tid, vals] of Object.entries(topicScores)) {
      const pct = vals.total > 0 ? (vals.score / vals.total) * 100 : 0;
      topicPercentages.push({ topicId: tid, percentage: pct });
    }
    topicPercentages.sort((a, b) => a.percentage - b.percentage);

    const weakest = topicPercentages.slice(0, 3);
    const topicNames: Record<string, string> = {};
    if (weakest.length > 0) {
      const topicFetches = weakest.map((w) => firestore.collection("topics").doc(w.topicId).get());
      const topicDocs = await Promise.all(topicFetches);
      topicDocs.forEach((td) => {
        if (td.exists) {
          const d = td.data() as any;
          topicNames[td.id] = String(d.title || td.id);
        }
      });
    }

    const weaknesses = weakest.map((w) => topicNames[w.topicId] || w.topicId).filter(Boolean);
    const suggestions = weaknesses.map((name) => `Focus on: ${name}`);


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

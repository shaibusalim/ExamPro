import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = token ? verifyToken(token) : null;

  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await firestore.collection("exam_attempts").get();

  const data = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = token ? verifyToken(token) : null;

  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { attemptId } = await req.json();
    if (!attemptId) {
      return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
    }
    const ref = firestore.collection("exam_attempts").doc(String(attemptId));
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    const data = snap.data() as any;
    await ref.update({
      status: "published",
      adminReviewed: true,
      publishedAt: new Date(),
    });
    const notif = {
      studentId: String(data.studentId || ""),
      type: "result_published",
      payload: { attemptId: String(attemptId), examId: String(data.examId || "") },
      createdAt: new Date(),
      unread: true,
    };
    if (notif.studentId) {
      await firestore.collection("notifications").add(notif);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to publish result" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = token ? verifyToken(token) : null;

  if (!decoded || decoded.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { attemptId, adjustments } = await req.json();
    if (!attemptId || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({ error: "Missing attemptId or adjustments" }, { status: 400 });
    }

    const ref = firestore.collection("exam_attempts").doc(String(attemptId));
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }
    const data = snap.data() as any;
    const answers = (data.answers || {}) as Record<string, any>;

    for (const adj of adjustments) {
      const qid = String(adj.questionId || "");
      const newMarks = Number(adj.marksAwarded);
      if (!qid || !(qid in answers)) continue;
      const qm = Number(answers[qid]?.questionMarks ?? 0);
      const clamped = Math.max(0, Math.min(qm, isNaN(newMarks) ? 0 : newMarks));
      answers[qid] = {
        ...answers[qid],
        marksAwarded: clamped,
        adminAdjusted: true,
      };
    }

    let score = 0;
    let totalMarks = 0;
    for (const qid of Object.keys(answers)) {
      const a = answers[qid];
      totalMarks += Number(a.questionMarks ?? 0);
      score += Number(a.marksAwarded ?? 0);
    }
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    await ref.update({
      answers,
      score,
      totalMarks,
      percentage,
      status: "pending_review",
      adminReviewed: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true, score, totalMarks, percentage });
  } catch (e) {
    console.error("[API/Admin/Scores/PATCH] Error:", e);
    return NextResponse.json({ error: "Failed to adjust marks" }, { status: 500 });
  }
}

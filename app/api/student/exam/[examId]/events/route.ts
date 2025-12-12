import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest, context: { params: Promise<{ examId: string }> }) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await context.params;
    const studentId = decoded.userId;
    const body = await request.json();
    const attemptId: string = String(body.attemptId || "");
    const type: string = String(body.type || "");
    const details: any = body.details || {};

    if (!attemptId || !type) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await firestore.collection("activity_logs").add({
      examId,
      attemptId,
      userId: studentId,
      type,
      details,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[API/ExamEvents] Error:", e);
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

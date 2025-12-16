import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const snap = await firestore
      .collection("notifications")
      .where("studentId", "==", decoded.userId)
      .get();
    const out = snap.docs.map((d) => {
      const v = d.data() as any;
      const createdAt =
        typeof v.createdAt === "string"
          ? v.createdAt
          : (v.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString());
      return {
        id: d.id,
        type: String(v.type || ""),
        payload: v.payload || {},
        created_at: createdAt,
        unread: !!v.unread,
      };
    }).sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    }).slice(0, 20);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || decoded.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 });
    }
    const ref = firestore.collection("notifications").doc(String(notificationId));
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const v = snap.data() as any;
    if (String(v.studentId || "") !== String(decoded.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await ref.update({ unread: false, readAt: Timestamp.now() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

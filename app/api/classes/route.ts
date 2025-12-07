import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Classes] GET request received."); // Debugging
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Classes] Unauthorized: No auth header."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Classes] Token extracted, verifying..."); // Debugging
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "admin") {
      console.log("[API/Classes] Unauthorized: Token verification failed or not a teacher."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = decoded.userId;
    console.log("[API/Classes] Admin ID:", teacherId); // Debugging

    let classesSnapshot = await firestore
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .orderBy("createdAt", "desc")
      .get();

    if (classesSnapshot.empty) {
      console.log("[API/Classes] No classes for this admin. Falling back to all classes");
      classesSnapshot = await firestore
        .collection("classes")
        .orderBy("createdAt", "desc")
        .limit(25)
        .get();

      if (classesSnapshot.empty) {
        console.log("[API/Classes] Classes collection is empty. Seeding B7/B8.");
        const seed = [
          { name: "Basic 7", level: "B7", teacherId: teacherId, description: null, createdAt: new Date().toISOString() },
          { name: "Basic 8", level: "B8", teacherId: teacherId, description: null, createdAt: new Date().toISOString() },
        ];
        for (const s of seed) {
          await firestore.collection("classes").add(s);
        }
        classesSnapshot = await firestore
          .collection("classes")
          .orderBy("createdAt", "desc")
          .limit(25)
          .get();
      }
    }

    const classes = await Promise.all(classesSnapshot.docs.map(async (d) => {
      const classData = d.data();
      const enrollmentsSnapshot = await firestore
        .collection("enrollments")
        .where("classId", "==", d.id)
        .get();
      const student_count = enrollmentsSnapshot.size;
      return { id: d.id, ...classData, student_count };
    }));

    console.log("[API/Classes] Classes prepared:", classes); // Debugging
    return NextResponse.json(classes);
  } catch (error) {
    console.error("[Firebase] Error fetching classes:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, level, description } = await request.json();

    const newClass = {
      name,
      level,
      teacherId: decoded.userId,
      description: description || null,
      createdAt: new Date().toISOString(),
    };
    const docRef = await firestore.collection("classes").add(newClass);

    return NextResponse.json({ id: docRef.id, ...newClass }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating class:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

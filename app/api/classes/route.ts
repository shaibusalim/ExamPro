import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, orderBy } from "firebase/firestore";

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

    if (!decoded || decoded.role !== "teacher") {
      console.log("[API/Classes] Unauthorized: Token verification failed or not a teacher."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = decoded.userId;
    console.log("[API/Classes] Teacher ID:", teacherId); // Debugging

    const classesRef = collection(db, "classes");
    const q = query(classesRef, where("teacherId", "==", teacherId), orderBy("createdAt", "desc"));
    console.log("[API/Classes] Querying classes for teacher ID:", teacherId); // Debugging
    const querySnapshot = await getDocs(q);
    console.log("[API/Classes] Found classes:", querySnapshot.size); // Debugging

    const classes = await Promise.all(querySnapshot.docs.map(async (doc) => {
      const classData = doc.data();
      // To get student count, query the 'enrollments' collection
      const enrollmentsRef = collection(db, "enrollments");
      const enrollmentQuery = query(enrollmentsRef, where("classId", "==", doc.id));
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      const student_count = enrollmentSnapshot.size;

      return {
        id: doc.id,
        ...classData,
        student_count,
      };
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

    if (!decoded || decoded.role !== "teacher") {
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

    const docRef = await addDoc(collection(db, "classes"), newClass);

    return NextResponse.json({ id: docRef.id, ...newClass }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating class:", error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

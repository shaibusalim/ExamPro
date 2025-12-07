import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export async function GET(request: NextRequest) {
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

    const studentClassLevel = decoded.classLevel; // Assuming classLevel is in the token

    if (!studentClassLevel) {
      return NextResponse.json({ error: "Student class level not found in token" }, { status: 400 });
    }

    const examsRef = collection(db, "exams");
    const q = query(examsRef, where("classId", "==", studentClassLevel), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const exams = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(exams);
  } catch (error) {
    console.error("[API/Student/Exams/Custom] Error fetching exams:", error);
    return NextResponse.json({ error: "Failed to fetch custom exams" }, { status: 500 });
  }
}

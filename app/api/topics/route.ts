import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, orderBy } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    // Note: The original route did not have token verification.
    // If authentication/authorization is needed for topics, verifyToken should be added.

    const classLevel = request.nextUrl.searchParams.get("level");

    const topicsRef = collection(db, "topics");
    let q = query(topicsRef); // Start with base collection query

    if (classLevel) {
      q = query(q, where("classLevel", "==", classLevel)); // Apply where clause if classLevel is present
    }
    // Removed orderBy("weekNumber", "asc") to resolve persistent 500 error.
    // Client-side sorting will be implemented to maintain topic order.
    // The composite index for 'classLevel' (Ascending) is still required if 'classLevel' is used.
    // If 'weekNumber' ordering is critical, client-side sorting is recommended given the API issue.

    const querySnapshot = await getDocs(q);
    const topics = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(topics);
  } catch (error) {
    console.error("[Firebase] Error fetching topics:", error);
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { verifyToken } = await import("@/lib/auth"); // Import dynamically for better tree-shaking
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, classLevel, weekNumber } = await request.json();

    if (!title || !classLevel) {
      return NextResponse.json({ error: "Title and classLevel are required" }, { status: 400 });
    }

    const newTopic = {
      title,
      classLevel,
      weekNumber: weekNumber || null,
      createdBy: decoded.userId,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "topics"), newTopic);

    return NextResponse.json({ id: docRef.id, ...newTopic, message: "Topic created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating topic:", error);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}

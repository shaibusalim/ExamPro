import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const classLevel = request.nextUrl.searchParams.get("classLevel"); // Changed from "level" to "classLevel"

    const topicsRef = collection(db, "topics");
    let q = query(topicsRef);
    if (classLevel) {
      q = query(q, where("classLevel", "==", classLevel));
    }

    const querySnapshot = await getDocs(q);
    let topics = querySnapshot.docs.map((doc) => {
      const data: any = doc.data();
      const title = data.title || data.name || "Untitled";
      const level = data.classLevel || data.class_level || undefined;
      const weekNumber = data.weekNumber ?? null;
      return {
        id: doc.id,
        title,
        classLevel: level,
        class_level: level,
        weekNumber,
      };
    });

    if (classLevel) {
      topics = topics.filter((t) => t.classLevel === classLevel);
    }

    topics.sort((a, b) => {
      const wa = a.weekNumber ?? Infinity;
      const wb = b.weekNumber ?? Infinity;
      if (wa === wb) return a.title.localeCompare(b.title);
      return wa - wb;
    });

    if (topics.length > 0) {
      return NextResponse.json(topics);
    }

    const FALLBACK_TOPICS = [
      { title: "REVISION", classLevel: "B7", weekNumber: 1 },
      { title: "Components of Computers and Computer Systems", classLevel: "B7", weekNumber: 2 },
      { title: "Components of Computers and Computer Systems", classLevel: "B7", weekNumber: 3 },
      { title: "Components of Computers and Computer Systems", classLevel: "B7", weekNumber: 4 },
      { title: "Technology in the community", classLevel: "B7", weekNumber: 5 },
      { title: "Technology in the community", classLevel: "B7", weekNumber: 6 },
      { title: "Technology in the community", classLevel: "B7", weekNumber: 7 },
      { title: "Health and Safety in using ICT tools", classLevel: "B7", weekNumber: 8 },
      { title: "Health and Safety in using ICT tools", classLevel: "B7", weekNumber: 9 },
      { title: "Introduction to Word Processing", classLevel: "B7", weekNumber: 10 },
      { title: "REVISION", classLevel: "B8", weekNumber: 1 },
      { title: "Introduction To Computing Generation Of Computers", classLevel: "B8", weekNumber: 2 },
      { title: "Storage Systems", classLevel: "B8", weekNumber: 2 },
      { title: "Health and Safety in using ICT tools", classLevel: "B8", weekNumber: 2 },
      { title: "Introduction To Computing Input & Output Devices", classLevel: "B8", weekNumber: 3 },
      { title: "File Management Techniques", classLevel: "B8", weekNumber: 4 },
      { title: "Productivity Software", classLevel: "B8", weekNumber: 5 },
      { title: "Creating Tables & Hyperlinks", classLevel: "B8", weekNumber: 5 },
      { title: "Productivity Software", classLevel: "B8", weekNumber: 6 },
      { title: "Creating Tables & Hyperlinks", classLevel: "B8", weekNumber: 6 },
      { title: "Productivity Software", classLevel: "B8", weekNumber: 7 },
      { title: "Creating Tables & Hyperlinks", classLevel: "B8", weekNumber: 7 },
      { title: "Productivity Software", classLevel: "B8", weekNumber: 8 },
      { title: "Introduction to Presentation", classLevel: "B8", weekNumber: 8 },
      { title: "Productivity Software", classLevel: "B8", weekNumber: 9 },
      { title: "Introduction to Presentation", classLevel: "B8", weekNumber: 9 },
      { title: "Communication Networks Computer Networks", classLevel: "B8", weekNumber: 10 },
    ];

    let fb = FALLBACK_TOPICS.map((t, idx) => ({
      id: `fb-${idx + 1}`,
      title: t.title,
      classLevel: t.classLevel,
      class_level: t.classLevel,
      weekNumber: t.weekNumber,
    }));

    if (classLevel) {
      fb = fb.filter((t) => t.classLevel === classLevel);
    }

    fb.sort((a, b) => {
      const wa = a.weekNumber ?? Infinity;
      const wb = b.weekNumber ?? Infinity;
      if (wa === wb) return a.title.localeCompare(b.title);
      return wa - wb;
    });

    return NextResponse.json(fb);
  } catch {
    const FALLBACK_TOPICS = [
      { title: "Internet and Social Media", classLevel: "B7", weekNumber: 9 },
      { title: "Computer Networks", classLevel: "B7", weekNumber: 7 },
      { title: "Introduction to Presentation", classLevel: "B8", weekNumber: 8 },
    ];
    let fb = FALLBACK_TOPICS.map((t, idx) => ({
      id: `fb-${idx + 1}`,
      title: t.title,
      classLevel: t.classLevel,
      class_level: t.classLevel,
      weekNumber: t.weekNumber,
    }));
    const classLevel = request.nextUrl.searchParams.get("classLevel"); // Changed from "level" to "classLevel"
    if (classLevel) fb = fb.filter((t) => t.classLevel === classLevel);
    return NextResponse.json(fb);
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

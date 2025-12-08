import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || !["teacher", "admin"].includes(decoded.role)) { // Updated authorization
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId, questionText, questionType, difficultyLevel, marks, correctAnswer, explanation, options, imageUrl, classLevel } = // Destructured imageUrl and classLevel
      await request.json();

    if (classLevel && !["B7", "B8"].includes(classLevel)){
      return NextResponse.json({ error: "Invalid classLevel provided" }, { status: 400 });
    }

    // Insert question
    const typeRaw = String(questionType || '').toLowerCase()
    const typeMap: Record<string, string> = {
      objective: 'mcq',
      mcq: 'mcq',
      'true_false': 'true_false',
      'true/false': 'true_false',
      tf: 'true_false',
      essay: 'essay',
      theory: 'essay',
    }
    const normalizedType = typeMap[typeRaw] || 'mcq'

    const newQuestion = {
      topicId: topicId || null,
      questionText,
      questionType: normalizedType,
      difficultyLevel: difficultyLevel || "medium",
      marks: marks || 1,
      correctAnswer: correctAnswer || null,
      explanation: explanation || null,
      imageUrl: imageUrl || null, // Added imageUrl
      createdBy: decoded.userId,
      isPublished: true, // Default to true
      createdAt: new Date(),
      classLevel: classLevel || null, // Added classLevel
    };

    const questionDocRef = await firestore.collection("questions").add(newQuestion as any);
    const questionId = questionDocRef.id;

    // Insert options if MCQ or True/False
    if (options && Array.isArray(options) && ["mcq", "true_false"].includes(normalizedType)) {
      const batch = firestore.batch();
      options.forEach((option, index) => {
        const optionRef = firestore.collection("questions").doc(questionId).collection("options").doc();
        batch.set(optionRef, {
          optionText: option.text,
          optionOrder: index + 1,
          isCorrect: !!option.isCorrect,
        } as any);
      });
      await batch.commit();
      // Also store plain options array on question for ease of display (without correctness)
      await firestore.collection("questions").doc(questionId).update({ options: options.map((o: any) => o.text) });
    }

    return NextResponse.json({ id: questionId, ...newQuestion, message: "Question created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating question:", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Questions] GET request received.");
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Questions] Unauthorized: No auth header.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Questions] Token extracted, verifying...");
    const decoded = verifyToken(token);

    // CORRECTED AUTHORIZATION LOGIC to allow both \'teacher\' and \'admin\'
    if (!decoded || (decoded.role !== "teacher" && decoded.role !== "admin")) {
      console.log("[API/Questions] Unauthorized: Token verification failed or not a teacher/admin.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = decoded.userId;
    console.log("[API/Questions] Teacher ID:", teacherId);
    const topicId = request.nextUrl.searchParams.get("topicId");
    const classLevel = request.nextUrl.searchParams.get("classLevel"); // ADD THIS
    console.log("[API/Questions] Topic ID (if any):", topicId);
    console.log("[API/Questions] Class Level (if any):", classLevel); // ADD THIS

    let base: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = firestore.collection("questions");
    if (topicId) {
      base = base.where("topicId", "==", topicId);
      console.log("[API/Questions] Filtering by Topic ID:", topicId);
    }
    if (classLevel) {
      base = base.where("classLevel", "==", classLevel);
      console.log("[API/Questions] Filtering by Class Level:", classLevel);
    }

    console.log("[API/Questions] Querying questions (admin)...");
    const snap = await base.get();
    console.log("[API/Questions] Found questions:", snap.size);

    const questions = await Promise.all(snap.docs.map(async (docSnap) => {
      const data = docSnap.data() as any;
      let options: any[] = [];

      const typeRawGet = String(data.questionType || '').toLowerCase()
      if (["mcq", "true_false"].includes(typeRawGet)) {
        const optSnap = await firestore
          .collection("questions")
          .doc(docSnap.id)
          .collection("options")
          .orderBy("optionOrder")
          .get();
        options = optSnap.docs.map((od) => {
          const ov: any = od.data();
          return {
            id: od.id,
            text: ov.optionText,
            order: ov.optionOrder,
            isCorrect: !!ov.isCorrect,
          };
        });
      }

      return {
        id: docSnap.id,
        ...data,
        options,
      };
    }));

    const sorted = questions.sort((a: any, b: any) => {
      const ta = a.createdAt && typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.createdAt && typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });

    console.log("[API/Questions] Questions prepared:", sorted.length);
    return NextResponse.json(sorted);
  } catch (error) {
    console.error("[Firebase] Error fetching questions:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

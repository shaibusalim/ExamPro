import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, writeBatch, orderBy } from "firebase/firestore";

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

    const { topicId, questionText, questionType, difficultyLevel, marks, correctAnswer, explanation, options } =
      await request.json();

    // Insert question
    const newQuestion = {
      topicId: topicId || null,
      questionText,
      questionType,
      difficultyLevel: difficultyLevel || "medium",
      marks: marks || 1,
      correctAnswer: correctAnswer || null,
      explanation: explanation || null,
      createdBy: decoded.userId,
      isPublished: true, // Default to true
      createdAt: new Date().toISOString(),
    };

    const questionDocRef = await addDoc(collection(db, "questions"), newQuestion);
    const questionId = questionDocRef.id;

    // Insert options if MCQ or True/False
    if (options && Array.isArray(options) && ["mcq", "true_false"].includes(questionType)) {
      const batch = writeBatch(db);
      options.forEach((option, index) => {
        const optionRef = doc(collection(db, "questions", questionId, "options"));
        batch.set(optionRef, {
          optionText: option.text,
          optionOrder: index + 1,
          isCorrect: option.isCorrect || false,
        });
      });
      await batch.commit();
    }

    return NextResponse.json({ id: questionId, ...newQuestion, message: "Question created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[Firebase] Error creating question:", error);
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Questions] GET request received."); // Debugging
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Questions] Unauthorized: No auth header."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Questions] Token extracted, verifying..."); // Debugging
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "teacher") {
      console.log("[API/Questions] Unauthorized: Token verification failed or not a teacher."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacherId = decoded.userId;
    console.log("[API/Questions] Teacher ID:", teacherId); // Debugging
    const topicId = request.nextUrl.searchParams.get("topicId");
    console.log("[API/Questions] Topic ID (if any):", topicId); // Debugging

    const questionsRef = collection(db, "questions");
    let q = query(questionsRef, where("createdBy", "==", teacherId), orderBy("createdAt", "desc"));

    if (topicId) {
      q = query(q, where("topicId", "==", topicId));
      console.log("[API/Questions] Filtering by Topic ID:", topicId); // Debugging
    }

    console.log("[API/Questions] Querying questions..."); // Debugging
    const querySnapshot = await getDocs(q);
    console.log("[API/Questions] Found questions:", querySnapshot.size); // Debugging

    const questions = await Promise.all(querySnapshot.docs.map(async (questionDoc) => {
      const questionData = questionDoc.data();
      let options: any[] = [];

      if (["mcq", "true_false"].includes(questionData.questionType)) {
        const optionsRef = collection(db, "questions", questionDoc.id, "options");
        const optionsSnapshot = await getDocs(query(optionsRef, orderBy("optionOrder")));
        options = optionsSnapshot.docs.map(optionDoc => ({
          id: optionDoc.id,
          ...optionDoc.data(),
        }));
      }

      return {
        id: questionDoc.id,
        ...questionData,
        options,
      };
    }));

    console.log("[API/Questions] Questions prepared:", questions); // Debugging
    return NextResponse.json(questions);
  } catch (error) {
    console.error("[Firebase] Error fetching questions:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    // Note: The original route did not have token verification.
    // If authentication/authorization is needed for topics, verifyToken should be added.

    const { topicId } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);

    const questionsRef = collection(db, "questions");
    const q = query(questionsRef, where("topicId", "==", topicId), where("isPublished", "==", true));
    const querySnapshot = await getDocs(q);

    let questionsWithDetails = await Promise.all(
      querySnapshot.docs.map(async (questionDoc) => {
        const questionData = questionDoc.data();
        let options: any[] = [];

        if (["MCQ", "True/False"].includes(questionData.questionType)) {
          const optionsRef = collection(db, "questions", questionDoc.id, "options");
          const optionsSnapshot = await getDocs(optionsRef);
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
      })
    );

    // Implement RANDOM() equivalent by shuffling in memory and then limiting
    const shuffledQuestions = questionsWithDetails.sort(() => Math.random() - 0.5);
    const finalQuestions = shuffledQuestions.slice(0, limit);

    return NextResponse.json(finalQuestions);
  } catch (error) {
    console.error("[Firebase] Error fetching topic questions:", error);
    return NextResponse.json({ error: "Failed to fetch topic questions" }, { status: 500 });
  }
}

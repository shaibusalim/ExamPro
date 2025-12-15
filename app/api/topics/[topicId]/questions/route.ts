import { type NextRequest, NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    // Note: The original route did not have token verification.
    // If authentication/authorization is needed for topics, verifyToken should be added.

    const { topicId } = await params;
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);

    let q = firestore.collection("questions")
      .where("topicId", "==", topicId)
      .where("isPublished", "==", true);
    const querySnapshot = await q.get();

    let questionsWithDetails = await Promise.all(
      querySnapshot.docs.map(async (questionDoc) => {
        const questionData = questionDoc.data() as any;
        let options: any[] = [];

        if (["MCQ", "True/False"].includes(String(questionData.questionType))) {
          const optionsRef = firestore.collection("questions").doc(questionDoc.id).collection("options");
          const optionsSnapshot = await optionsRef.get();
          options = optionsSnapshot.docs.map(optionDoc => ({
            id: optionDoc.id,
            ...(optionDoc.data() as any),
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
    try {
      const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
      const fallbackPath = path.join(process.cwd(), "basic8.json");
      const raw = fs.readFileSync(fallbackPath, "utf8");
      const parsed = JSON.parse(raw) as any[];
      const normalized = parsed.map((q, idx) => {
        const opts = Array.isArray(q.options)
          ? q.options.map((o: any) =>
              typeof o === "string"
                ? { id: `opt-${idx}-${Math.random().toString(36).slice(2)}`, text: o, order: 0, isCorrect: String(o) === String(q.correctAnswer) }
                : { id: `opt-${idx}-${Math.random().toString(36).slice(2)}`, text: o.text ?? String(o), order: 0, isCorrect: !!o.isCorrect }
            )
          : [];
        return {
          id: `fb-${idx + 1}`,
          questionText: q.questionText || q.question || "",
          questionType: String(q.questionType || "mcq").toLowerCase(),
          marks: typeof q.marks === "number" ? q.marks : 1,
          correctAnswer: q.correctAnswer || null,
          options: opts,
          explanation: q.explanation || null,
        };
      });
      const shuffled = normalized.sort(() => Math.random() - 0.5).slice(0, limit);
      return NextResponse.json(shuffled);
    } catch {
      return NextResponse.json({ error: "Failed to fetch topic questions" }, { status: 500 });
    }
  }
}

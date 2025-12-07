import { firestore } from "@/lib/firebaseAdmin"; // Admin SDK
import { NextRequest, NextResponse } from "next/server";

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  questionText: string;
  questionType: string;
  marks?: number;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string;
  options?: QuestionOption[];
}

export async function POST(req: NextRequest) {
  try {
    const { questions, topicIds, classLevel } = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    if (!topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ error: "At least one topicId is required" }, { status: 400 });
    }

    if (!classLevel || !["B7", "B8"].includes(classLevel)) {
      return NextResponse.json({ error: "Invalid class level" }, { status: 400 });
    }

    const batch = firestore.batch();
    const questionIds: string[] = [];

    for (const q of questions as Question[]) {
      const typeRaw = (q.questionType || '').toLowerCase()
      const typeMap: Record<string, string> = {
        objective: 'mcq',
        theory: 'essay',
        mcq: 'mcq',
        'true_false': 'true_false',
        fill_blank: 'fill_blank',
        essay: 'essay',
      }
      const normalizedType = typeMap[typeRaw] || 'mcq'
      const qRef = firestore.collection("questions").doc();
      questionIds.push(qRef.id);

      batch.set(qRef, {
        topicId: topicIds[0], // assign first topic
        questionText: q.questionText,
        questionType: normalizedType,
        marks: q.marks || 1,
        correctAnswer: q.correctAnswer || null,
        explanation: q.explanation || null,
        imageUrl: q.imageUrl || null,
        classLevel,
        createdAt: new Date(),
      });

      // If multiple-choice options exist
      if (normalizedType === 'mcq' || normalizedType === 'true_false') {
        const opts = Array.isArray(q.options) ? q.options : []
        if (opts.length > 0) {
        q.options.forEach((opt, idx) => {
          const optionRef = firestore.collection("questions").doc(qRef.id).collection("options").doc();
          batch.set(optionRef, {
            optionText: opt.text,
            optionOrder: idx + 1,
            isCorrect: opt.isCorrect,
          });
        });
        }
      }
    }

    await batch.commit();

    return NextResponse.json({
      message: `Uploaded ${questions.length} questions successfully`,
      questionIds,
    });
  } catch (err) {
    console.error("BULK UPLOAD ERROR:", err);
    return NextResponse.json({ error: "Failed to upload questions" }, { status: 500 });
  }
}

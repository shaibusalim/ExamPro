import { firestore } from "@/lib/firebaseAdmin"; // Admin SDK
import { NextRequest, NextResponse } from "next/server";

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface RubricKeyPoint {
  point: string;
  synonyms?: string[];
  weight?: number;
}

interface Question {
  questionText: string;
  questionType: string;
  marks?: number;
  correctAnswer?: string | string[];
  explanation?: string;
  imageUrl?: string;
  options?: QuestionOption[] | string[];
  rubric?: { keyPoints?: RubricKeyPoint[] };
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

    for (const q of questions as any[]) {
      const typeRaw = String(q.questionType || q.type || '').toLowerCase()
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

      const questionText: string = String(q.questionText ?? q.question ?? q.stem ?? '').trim();
      if (!questionText) {
        // Skip invalid entries rather than failing the entire batch
        console.warn('[Bulk] Skipping question with missing text');
        continue;
      }

      const rawAnswer = (q as any).correctAnswer ?? (q as any).explanation ?? (q as any).answer ?? null;
      const correctAnswer = Array.isArray(rawAnswer) || typeof rawAnswer === 'string' ? rawAnswer : null;
      const marks: number = typeof q.marks === 'number' ? q.marks : (normalizedType === 'essay' ? 4 : 1);

      const baseDoc: any = {
        topicId: topicIds[0], // assign first topic
        questionText,
        questionType: normalizedType,
        marks,
        correctAnswer: correctAnswer ?? null,
        explanation: typeof q.explanation === 'string' ? q.explanation : null,
        imageUrl: typeof q.imageUrl === 'string' ? q.imageUrl : null,
        classLevel,
        createdAt: new Date(),
      };
      if ((q as any).rubric && Array.isArray((q as any).rubric.keyPoints)) {
        baseDoc.rubric = { keyPoints: (q as any).rubric.keyPoints };
      }
      batch.set(qRef, baseDoc);

      // If multiple-choice options exist
      if (normalizedType === 'mcq' || normalizedType === 'true_false') {
        const rawOpts = Array.isArray(q.options) ? q.options : [];
        let opts: { text: string; isCorrect: boolean }[] = [];
        if (rawOpts.length > 0) {
          if (typeof rawOpts[0] === 'string') {
            const optStrings = rawOpts as string[];
            let correctIndex: number | null = null;
            const ansStr = typeof correctAnswer === 'string' ? correctAnswer : null;
            if (typeof ansStr === 'string') {
              const ans = ansStr.trim().toLowerCase();
              const letters = ['a', 'b', 'c', 'd'];
              if (letters.includes(ans)) {
                correctIndex = letters.indexOf(ans);
              } else if (/^[1-9]\d*$/.test(ans)) {
                const n = parseInt(ans, 10);
                if (n >= 1 && n <= optStrings.length) correctIndex = n - 1;
              } else {
                const idx = optStrings.findIndex((t) => String(t).toLowerCase() === ans);
                if (idx >= 0) correctIndex = idx;
              }
            }
            opts = optStrings.map((t: string, idx: number) => ({
              text: t,
              isCorrect: correctIndex !== null ? idx === correctIndex : false,
            }));
          } else {
            opts = rawOpts.map((o: any) => ({ text: String(o.text || o.optionText || ''), isCorrect: !!o.isCorrect }));
            // If none marked correct but we have an answerText, mark match
            if (!opts.some((o) => o.isCorrect) && typeof correctAnswer === 'string') {
              const ans = (correctAnswer as string).toLowerCase();
              opts = opts.map((o) => ({ ...o, isCorrect: o.text.toLowerCase() === ans }));
            }
          }
        }
        if (opts.length > 0) {
          opts.forEach((opt, idx) => {
            const optionRef = firestore.collection('questions').doc(qRef.id).collection('options').doc();
            batch.set(optionRef, {
              optionText: opt.text,
              optionOrder: idx + 1,
              isCorrect: !!opt.isCorrect,
            });
          });
          // Also store plain options for display convenience
          batch.update(qRef, { options: opts.map((o) => o.text) });
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

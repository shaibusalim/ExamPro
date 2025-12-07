import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { classLevel, subject, topic } = body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
Generate a set of exam questions for Basic 7–8 ICT based on the Ghana GES curriculum.

Requirements:
- 30 Objective questions (multiple choice)
- 10 Theory questions
- Total marks = 70
- Objective questions = 1 mark each
- Theory questions = 4 marks each
- Include diagrams or image descriptions ONLY when needed
- Return ONLY JSON in this format:

{
  "objective": [
    {
      "question": "",
      "options": ["", "", "", ""],
      "correctAnswer": "",
      "marks": 1,
      "media": null
    }
  ],
  "theory": [
    {
      "question": "",
      "marks": 4,
      "media": null
    }
  ]
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return new Response("No content in response", { status: 500 });
    }

    const data = JSON.parse(content);

    return Response.json(data);
  } catch (error) {
    console.error("Exam generation error:", error);
    return new Response("Failed to generate exam", { status: 500 });
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { verifyToken } from "@/lib/auth"; // Assuming token verification is needed

// Hardcoded lesson content for demonstration. In a real app, this would be
// fetched dynamically from parsed documents (e.g., from Firebase Storage or a CMS).
const LESSON_CONTENT: Record<string, Record<string, string>> = {
  "B7": {
    "Components of Computers and Computer Systems": `Components of Computers. Types of computers. Computer systems: hardware, software, and firmware.`,
    "Technology in the community": `Impact of technology on daily life. Online communication tools.`,
    "Health and Safety in using ICT tools": `Ergonomics. Cyberbullying. Online security risks.`,
    "Introduction to Word Processing": `Basics of word processing. Creating, editing, and formatting documents.`,
    "Introduction to Presentation": `Creating slides. Adding text, images, and transitions.`,
    "Introduction to Electronic Spreadsheet": `Creating spreadsheets. Basic formulas. Data entry.`,
    "Computer Networks": `Types of networks (LAN, WAN). Network devices.`,
    "Internet and Social Media": `Internet usage. Social media safety.`,
    "Information Security": `Data privacy. Cybersecurity threats.`,
    "Web Technologies": `Basic web concepts. HTML, CSS basics.`,
    "Introduction to Programming": `Algorithms. Flowcharts. Basic programming concepts.`,
    "Algorithm": `Definition of algorithm. Steps to create an algorithm.`,
    "Robotics": `Introduction to robotics. Uses of robots.`,
    "Artificial Intelligence": `Introduction to AI. Applications of AI.`
  },
  "B8": {
    "Introduction To Computing Generation Of Computers": `Evolution of computers. Generations of computers (e.g., vacuum tubes, transistors, integrated circuits, microprocessors, quantum computing).`,
    "Input & Output Devices": `Types of input devices (keyboard, mouse, scanner). Types of output devices (monitor, printer, speakers).`,
    "File Management Techniques": `Organizing files and folders. Copying, moving, deleting files. Drive management.`,
    "Productivity Software": `Overview of productivity suites. Word processors, spreadsheets, presentation software.`,
    "Creating Tables & Hyperlinks": `Inserting and formatting tables in documents. Creating hyperlinks.`,
    "Introduction to Desktop Publishing": `Concepts of DTP. Using DTP software for brochures, flyers.`,
    "Introduction to Presentation": `Advanced presentation features. Multimedia integration.`,
    "Communication Networks Computer Networks": `Network topologies. Network protocols. Internet and WWW.`,
    "Computational Thinking Introduction to Programming": `Variables, constants, data types. Control structures.`,
    "Storage Systems": `Primary and secondary storage. RAM, ROM, hard drives, SSDs, cloud storage.`,
    "Health and Safety in using ICT tools": `Review of ergonomics and safety. Advanced cyber threats.`,
    "Introduction to Electronic Spreadsheet": `Advanced spreadsheet formulas. Data analysis.`,
    "Information Security": `Encryption. Antivirus. Firewalls.`,
    "Internet and Social Media": `Digital citizenship. Online privacy.`,
    "Web Technologies": `Client-side vs. server-side scripting. Web development tools.`,
    "Algorithm": `Advanced algorithm design. Efficiency of algorithms.`,
    "Artificial Intelligence": `Machine learning concepts. AI ethics.`,
    "Robotics": `Robotics design. Automation.`
  }
};


export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "student") { // Changed from "teacher" to "student"
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicTitle, classLevel, numberOfQuestions = 5, questionType = "mcq" } = await request.json();

    if (!topicTitle || !classLevel) {
      return NextResponse.json({ error: "topicTitle and classLevel are required" }, { status: 400 });
    }

    const lessonText = LESSON_CONTENT[classLevel]?.[topicTitle];
    if (!lessonText) {
      return NextResponse.json({ error: `Lesson content not found for ${topicTitle} in ${classLevel}` }, { status: 404 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Using gemini-pro for text generation

    let prompt = "";
    if (questionType === "mcq") {
      prompt = `Generate ${numberOfQuestions} multiple-choice questions (MCQs) based on the following text. For each question, provide the question, four options (A, B, C, D), and clearly indicate the correct answer. Ensure questions are directly derivable from the text.
      Text: "${lessonText}"`;
    } else if (questionType === "true_false") {
      prompt = `Generate ${numberOfQuestions} true/false questions based on the following text. For each question, provide the statement and clearly indicate if it's true or false. Ensure questions are directly derivable from the text.
      Text: "${lessonText}"`;
    } else {
      prompt = `Generate ${numberOfQuestions} short answer questions based on the following text. Ensure questions are directly derivable from the text.
      Text: "${lessonText}"`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Basic parsing: This is highly dependent on Gemini's output format.
    // A more robust parser would be needed for production.
    const generatedQuestions = text.split('\n\n').filter(block => block.trim() !== '').map(block => {
      // Attempt to parse different question types
      if (questionType === "mcq") {
        const lines = block.split('\n').filter(line => line.trim() !== '');
        const qText = lines[0]?.replace(/^\d+\.\s*/, '').trim();
        const options = lines.slice(1, -1).map(line => line.replace(/^[A-D]\.\s*/, '').trim());
        const correctAnswerLine = lines[lines.length - 1]?.trim();
        const correctAnswerMatch = correctAnswerLine?.match(/Correct Answer:\s*([A-D])/i);
        const correctAnswerLetter = correctAnswerMatch ? correctAnswerMatch[1] : '';

        return {
          questionText: qText || 'Generated MCQ Question',
          questionType: 'mcq',
          marks: 1, // Default marks
          options: options.map((optText, idx) => ({
            text: optText,
            isCorrect: String.fromCharCode(65 + idx) === correctAnswerLetter,
          })),
          correctAnswer: correctAnswerLetter, // Store the letter for MCQs
          explanation: '', // Gemini doesn't provide it by default in this prompt
        };
      } else if (questionType === "true_false") {
        const statement = block.replace(/^\d+\.\s*/, '').trim();
        const isTrue = statement.toLowerCase().includes('true'); // Basic heuristic, improve if needed
        return {
          questionText: statement,
          questionType: 'true_false',
          marks: 1,
          options: [{ text: 'True', isCorrect: isTrue }, { text: 'False', isCorrect: !isTrue }],
          correctAnswer: isTrue ? 'True' : 'False',
          explanation: '',
        };
      } else { // Short answer
        return {
          questionText: block.replace(/^\d+\.\s*/, '').trim(),
          questionType: 'short_answer', // Assuming 'short_answer' for other types
          marks: 1,
          correctAnswer: '', // No specific correct answer for short answer here
          explanation: '',
        };
      }
    });

    return NextResponse.json({ generatedQuestions });

  } catch (error) {
    console.error("[Gemini API] Error generating questions:", error);
    return NextResponse.json({ error: "Failed to generate questions using AI" }, { status: 500 });
  }
}

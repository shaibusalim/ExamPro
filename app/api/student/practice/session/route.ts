import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const demoObjectives = [
      { id: "obj-1", question: "Which device is used to input text into a computer?", type: "objective", options: ["Monitor", "Keyboard", "Printer", "Speaker"], answer: "Keyboard", marks: 1 },
      { id: "obj-2", question: "Which one is an output device?", type: "objective", options: ["Mouse", "Scanner", "Monitor", "Keyboard"], answer: "Monitor", marks: 1 },
      { id: "obj-3", question: "What does CPU stand for?", type: "objective", options: ["Central Process Unit", "Central Processing Unit", "Computer Power Unit", "Control Processing Utility"], answer: "Central Processing Unit", marks: 1 },
      { id: "obj-4", question: "Which storage is volatile?", type: "objective", options: ["Hard Disk", "SSD", "RAM", "Flash Drive"], answer: "RAM", marks: 1 },
      { id: "obj-5", question: "Which key is used to delete characters to the left?", type: "objective", options: ["Enter", "Tab", "Backspace", "Shift"], answer: "Backspace", marks: 1 },
      { id: "obj-6", question: "Which file extension belongs to a Word document?", type: "objective", options: [".pptx", ".xlsx", ".docx", ".pdf"], answer: ".docx", marks: 1 },
      { id: "obj-7", question: "Which device moves the pointer on a screen?", type: "objective", options: ["Mouse", "Keyboard", "Projector", "Microphone"], answer: "Mouse", marks: 1 },
      { id: "obj-8", question: "Which is a correct example of productivity software?", type: "objective", options: ["Notepad", "Paint", "Microsoft Word", "Calculator"], answer: "Microsoft Word", marks: 1 },
      { id: "obj-9", question: "Which shortcut copies selected text?", type: "objective", options: ["Ctrl+V", "Ctrl+C", "Ctrl+X", "Ctrl+Z"], answer: "Ctrl+C", marks: 1 },
      { id: "obj-10", question: "Which part of a computer displays information visually?", type: "objective", options: ["CPU", "Monitor", "Router", "UPS"], answer: "Monitor", marks: 1 },
    ]
    const demoTheory = [
      { id: "thy-1", question: "Explain two safety rules when using a computer lab.", type: "theory", marks: 4 },
      { id: "thy-2", question: "List and describe three functions of an operating system.", type: "theory", marks: 4 },
      { id: "thy-3", question: "Briefly outline steps to create and save a document in a word processor.", type: "theory", marks: 4 },
      { id: "thy-4", question: "State differences between input and output devices with examples.", type: "theory", marks: 4 },
    ]
    const questions = [...demoObjectives, ...demoTheory]
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0)
    return NextResponse.json({ questions, totalMarks })
  } catch {
    return NextResponse.json({ error: "Failed to load demo session" }, { status: 500 })
  }
}

// scripts/seed-topics.ts
import "dotenv/config"; // To load .env variables
import fetch from "node-fetch"; // For Node.js versions without global fetch, or for explicit import

const TOPICS = [
  // B7 Topics - Derived from B7 T1 SCHEME.docx (and general curriculum terms)
  { title: "REVISION", classLevel: "B7", weekNumber: 1 },
  { title: "Components of Computers and Computer Systems", classLevel: "B7", weekNumber: 2 },
  { title: "Technology in the community", classLevel: "B7", weekNumber: 5 },
  { title: "Health and Safety in using ICT tools", classLevel: "B7", weekNumber: 8 },
  { title: "Introduction to Word Processing", classLevel: "B7", weekNumber: 10 },
  { title: "Introduction to Presentation", classLevel: "B7", weekNumber: 13 },
  { title: "Introduction to Electronic Spreadsheet", classLevel: "B7", weekNumber: 3 }, // From Second Term
  { title: "Computer Networks", classLevel: "B7", weekNumber: 7 }, // From Second Term
  { title: "Internet and Social Media", classLevel: "B7", weekNumber: 9 }, // From Second Term
  { title: "Information Security", classLevel: "B7", weekNumber: 11 }, // From Second Term
  { title: "Web Technologies", classLevel: "B7", weekNumber: 2 }, // From Third Term
  { title: "Introduction to Programming", classLevel: "B7", weekNumber: 4 }, // From Third Term
  { title: "Algorithm", classLevel: "B7", weekNumber: 7 }, // From Third Term
  { title: "Robotics", classLevel: "B7", weekNumber: 9 }, // From Third Term
  { title: "Artificial Intelligence", classLevel: "B7", weekNumber: 10 }, // From Third Term

  // B8 Topics - Derived from B8 T1 SCHEME.docx (and general curriculum terms)
  { title: "REVISION", classLevel: "B8", weekNumber: 1 },
  { title: "Introduction To Computing Generation Of Computers", classLevel: "B8", weekNumber: 2 },
  { title: "Input & Output Devices", classLevel: "B8", weekNumber: 3 }, // Simplified from "Introduction To Computing Input & Output Devices."
  { title: "File Management Techniques", classLevel: "B8", weekNumber: 4 }, // Used from "Introduction To Computing Management Techniques"
  { title: "Productivity Software", classLevel: "B8", weekNumber: 5 },
  { title: "Creating Tables & Hyperlinks", classLevel: "B8", weekNumber: 5 },
  { title: "Introduction to Desktop Publishing", classLevel: "B8", weekNumber: 5 }, // From Second Term
  { title: "Introduction to Presentation", classLevel: "B8", weekNumber: 8 }, // From First Term and Second Term
  { title: "Communication Networks Computer Networks", classLevel: "B8", weekNumber: 10 }, // From First Term
  { title: "Computational Thinking Introduction to Programming", classLevel: "B8", weekNumber: 12 }, // From First Term
  { title: "Storage Systems", classLevel: "B8", weekNumber: 2 }, // From Second Term
  { title: "Health and Safety in using ICT tools", classLevel: "B8", weekNumber: 2 }, // From Third Term
  { title: "Introduction to Electronic Spreadsheet", classLevel: "B8", weekNumber: 4 }, // From Third Term
  { title: "Information Security", classLevel: "B8", weekNumber: 7 }, // From Third Term
  { title: "Internet and Social Media", classLevel: "B8", weekNumber: 9 }, // From Third Term
  { title: "Web Technologies", classLevel: "B8", weekNumber: 9 }, // From Third Term
  { title: "Algorithm", classLevel: "B8", weekNumber: 10 }, // From Second Term
  { title: "Artificial Intelligence", classLevel: "B8", weekNumber: 11 }, // From Third Term
  { title: "Robotics", classLevel: "B8", weekNumber: 12 }, // From Second Term
];

async function seedTopics() {
  const token = process.env.AUTH_TOKEN; // User needs to provide this
  if (!token) {
    console.error("AUTH_TOKEN environment variable is not set. Please set it to a teacher's authentication token.");
    console.error("You can obtain a teacher's token by logging into the application as a teacher and inspecting localStorage in your browser's developer tools (Application -> Local Storage -> auth_token).");
    process.exit(1);
  }

  console.log("Starting to seed topics...");
  for (const topic of TOPICS) {
    try {
      const response = await fetch("http://localhost:3000/api/topics", { // Assuming local development server on port 3000
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(topic),
      });

      if (response.ok) {
        const data = (await response.json()) as { id: string; title: string };
        console.log(`Successfully added topic: ${data.title} (ID: ${data.id})`);
      } else {
        const errorData = (await response.json().catch(() => ({ error: "Failed to parse error response" }))) as { error?: string };
        console.error(`Failed to add topic: ${topic.title}. Status: ${response.status}. Error: ${errorData.error || JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error(`Error processing topic ${topic.title}:`, error);
    }
  }
  console.log("Topic seeding complete.");
}

seedTopics();

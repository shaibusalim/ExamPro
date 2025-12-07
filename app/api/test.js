require("dotenv").config();

console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("FIREBASE_PRIVATE_KEY (first 50 chars):", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50));

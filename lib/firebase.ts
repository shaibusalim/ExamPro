import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Added getStorage

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app;
if (!getApps().length) {
  console.log("[Firebase Init] Initializing Firebase app...");
  console.log("[Firebase Init] Firebase config: ", firebaseConfig); // Log the config
  app = initializeApp(firebaseConfig);
  console.log("[Firebase Init] Firebase app initialized.");
} else {
  app = getApp();
  console.log("[Firebase Init] Firebase app already initialized. Using existing app.");
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Export Firebase Storage
console.log("[Firebase Init] Firebase Auth, Firestore, and Storage instances exported.");

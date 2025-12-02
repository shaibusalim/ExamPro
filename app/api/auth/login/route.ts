import { type NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { generateToken } from "@/lib/auth"; // Keep generateToken for session management

// Define an interface for the user data stored in Firestore
interface FirestoreUser {
  fullName: string;
  role: "teacher" | "student" | "admin";
  classLevel?: string;
  studentId?: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log("[Firebase] Login attempt:", { email });

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Sign in user with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get additional user details from Firestore
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await auth.signOut(); // Log out if user data not found in Firestore
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Combine Firebase Auth user data with Firestore user data
    const firestoreData = userDocSnap.data() as FirestoreUser;
    const user = {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      ...firestoreData,
    };

    // Generate token
    const token = generateToken(user.id, user.email || '', user.role);

    // Get client IP for logging
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Log activity to Firestore
    await addDoc(collection(db, "activity_logs"), {
      userId: user.id,
      action: "LOGIN",
      description: `User logged in from ${clientIp}`,
      createdAt: new Date().toISOString(),
    });

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          classLevel: user.classLevel,
        },
        token: token, // Include the token in the response body for client-side storage
      },
      { status: 200 },
    );

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("[Firebase] Login error details:", error);
    let errorMessage = "Login failed. Please try again.";

    // Handle specific Firebase auth errors
    if (error.code === "auth/invalid-email" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      errorMessage = "Invalid email or password.";
    } else if (error.code) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    );
  }
}

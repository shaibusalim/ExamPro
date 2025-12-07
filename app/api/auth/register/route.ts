import { type NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { generateToken } from "@/lib/auth"; // Keep generateToken for session management

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role, classLevel, studentId } = await request.json();

    console.log("[Firebase] Registration attempt:", { email, role, fullName });

    // Validation
    if (!email || !password || !fullName || !role) {
      console.log("[Firebase] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Only students can register via public sign-up
    if (role !== "student") {
      return NextResponse.json({ error: "Registration restricted to students" }, { status: 403 })
    }

    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store additional user details in Firestore
    const userData = {
      email: user.email,
      fullName,
      role: "student",
      classLevel: classLevel || null,
      studentId: studentId || null,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", user.uid), userData);

    console.log("[Firebase] User created successfully:", user.uid);

    // Generate a session token (if needed for server-side logic, otherwise client-side Firebase session is enough)
    // For now, we'll keep the generateToken but it might need to be adapted or replaced
    const token = generateToken(user.uid, user.email || '', "student"); // Adapt generateToken for Firebase user

    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: user.uid,
          email: user.email,
          fullName: fullName,
          role: role,
        },
      },
      { status: 201 },
    );

    // Set a cookie for session management. Consider using Firebase ID tokens for more robust server-side verification.
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("[Firebase] Registration error details:", error);
    let errorMessage = "Registration failed. Please try again.";

    // Handle specific Firebase auth errors
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email already registered.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak.";
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

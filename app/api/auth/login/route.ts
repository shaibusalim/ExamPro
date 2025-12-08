import { type NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { firestore as adminFirestore } from "@/lib/firebaseAdmin";
import { firestore } from "@/lib/firebaseAdmin";
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

    // Optional admin bypass only when explicitly enabled
    const allowBypass = String(process.env.ALLOW_ADMIN_BYPASS || "false").toLowerCase() === "true";
    if (allowBypass) {
      const adminEmail = process.env.ADMIN_EMAIL || "";
      const adminPassword = process.env.ADMIN_PASSWORD || "";
      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        const token = generateToken("admin", adminEmail, "admin");
        const response = NextResponse.json(
          {
            message: "Login successful",
            user: {
              id: "admin",
              email: adminEmail,
              fullName: "System Admin",
              role: "admin",
              classLevel: null,
            },
            token,
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
      }
    }

    // Dev auto-user creation is disabled by default for security

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

    // Map legacy teacher role to admin
    const role = user.role === 'teacher' ? 'admin' : user.role;
    // Generate token
    const token = generateToken(user.id, user.email || '', role);

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
          role,
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
    if (error.code === "auth/invalid-email" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      errorMessage = "Invalid email or password.";
    } else if (error.code) {
      errorMessage = error.message;
    }

    // Dev auto-user fallback removed; return proper error codes
    const status = (error.code === "auth/invalid-email" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") ? 401 : 500;
    return NextResponse.json({ error: errorMessage }, { status })
  }
}

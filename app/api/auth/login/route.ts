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

    // Default admin login (bypass Firebase)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (email === adminEmail && password === adminPassword) {
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

    if (process.env.NODE_ENV !== "production") {
      try {
        const fallbackEmail = String(email || "").toLowerCase();
        const qSnap = await adminFirestore.collection("users").where("email", "==", fallbackEmail).get();
        let existingUserDoc = qSnap.empty ? null : qSnap.docs[0];
        let userId: string;
        if (existingUserDoc) {
          userId = existingUserDoc.id;
        } else {
          const newDoc = await adminFirestore.collection("users").add({
            email: fallbackEmail,
            fullName: fallbackEmail.split("@")[0],
            role: "student",
            classLevel: "B7",
            createdAt: new Date().toISOString(),
          });
          userId = newDoc.id;
        }
        const token = generateToken(userId, fallbackEmail, "student");
        const response = NextResponse.json(
          {
            message: "Login successful",
            user: {
              id: userId,
              email: fallbackEmail,
              fullName: fallbackEmail.split("@")[0],
              role: "student",
              classLevel: "B7",
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
      } catch {}
    }

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
    if (error.code === "auth/invalid-email" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      errorMessage = "Invalid email or password.";
    } else if (error.code) {
      errorMessage = error.message;
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const { email, password } = await request.json();
        const fallbackEmail = String(email || "").toLowerCase();
        if (!fallbackEmail) {
          return NextResponse.json({ error: errorMessage }, { status: 500 });
        }
        let existingUserDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
        const qSnap = await firestore.collection("users").where("email", "==", fallbackEmail).get();
        if (!qSnap.empty) {
          existingUserDoc = qSnap.docs[0];
        }
        let userId = existingUserDoc?.id || undefined;
        let fullName = existingUserDoc ? String((existingUserDoc.data() as any).fullName || "") : fallbackEmail.split("@")[0];
        let role = existingUserDoc ? String((existingUserDoc.data() as any).role || "student") : "student";
        let classLevel = existingUserDoc ? String((existingUserDoc.data() as any).classLevel || "B7") : "B7";
        if (!userId) {
          const docRef = await firestore.collection("users").add({
            email: fallbackEmail,
            fullName,
            role,
            classLevel,
            createdAt: new Date().toISOString(),
          } as any);
          userId = docRef.id;
        }
        const token = generateToken(userId, fallbackEmail, role);
        const response = NextResponse.json(
          {
            message: "Login successful (dev mode)",
            user: {
              id: userId,
              email: fallbackEmail,
              fullName,
              role,
              classLevel,
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
      } catch (fallbackErr) {
        console.error("[Login Fallback] Error:", fallbackErr);
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

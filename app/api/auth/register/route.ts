import { type NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/lib/firebaseAdmin";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { generateToken } from "@/lib/auth";

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

    // Normalize fields for uniqueness checks
    const emailLower = String(email).trim().toLowerCase();
    const nameTrim = String(fullName).trim();
    const nameNorm = nameTrim.toLowerCase().replace(/\s+/g, " ");
    const codeTrim = String(studentId || "").trim();
    const codeNorm = codeTrim ? codeTrim.toUpperCase().replace(/\s+/g, "") : "";

    // Uniqueness checks (prevent duplicate name/email/student code)
    // Email duplicates (defensive pre-check; Firebase Auth also enforces this)
    const existingByEmail = await adminFirestore
      .collection("users")
      .where("email", "==", emailLower)
      .limit(1)
      .get();
    if (!existingByEmail.empty) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    // Name duplicates (check both raw and normalized to catch legacy docs)
    const [dupNameRaw, dupNameNorm] = await Promise.all([
      adminFirestore.collection("users").where("fullName", "==", nameTrim).limit(1).get(),
      adminFirestore.collection("users").where("fullNameNormalized", "==", nameNorm).limit(1).get(),
    ]);
    if (!dupNameRaw.empty || !dupNameNorm.empty) {
      return NextResponse.json({ error: "Full name already registered." }, { status: 409 });
    }

    // Student code duplicates (optional field; check both raw and normalized)
    if (codeTrim) {
      const [dupCodeRaw, dupCodeNorm] = await Promise.all([
        adminFirestore.collection("users").where("studentId", "==", codeTrim).limit(1).get(),
        adminFirestore.collection("users").where("studentIdNormalized", "==", codeNorm).limit(1).get(),
      ]);
      if (!dupCodeRaw.empty || !dupCodeNorm.empty) {
        return NextResponse.json({ error: "Student code already registered." }, { status: 409 });
      }
    }

    // Create user with Firebase Authentication
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    } as const;

    if (!firebaseConfig.apiKey) {
      return NextResponse.json({ error: "Server missing Firebase configuration" }, { status: 500 });
    }

    const { initializeApp, getApps, getApp } = await import("firebase/app");
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth(app);

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store additional user details in Firestore (using Admin SDK to bypass client rules)
    const userData = {
      email: user.email,
      emailLower,
      fullName,
      fullNameNormalized: nameNorm,
      role: "student",
      classLevel: classLevel || null,
      studentId: studentId || null,
      studentIdNormalized: codeNorm || null,
      isApproved: false,
      createdAt: new Date().toISOString(),
    };
    await adminFirestore.collection("users").doc(user.uid).set(userData, { merge: true });

    console.log("[Firebase] User created successfully:", user.uid);


    const response = NextResponse.json(
      {
        message: "Registration submitted. Awaiting admin approval",
        user: {
          id: user.uid,
          email: user.email,
          fullName: fullName,
          role: role,
        },
      },
      { status: 201 },
    );



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

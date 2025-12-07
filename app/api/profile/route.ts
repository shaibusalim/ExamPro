import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { firestore } from "@/lib/firebaseAdmin";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: "teacher" | "student" | "admin";
  classLevel?: string;
  studentId?: string;
  lockedDashboard?: boolean;
  lockedExams?: boolean;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log("[API/Profile] Request received."); // Debugging
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      console.log("[API/Profile] Unauthorized: No auth header."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("[API/Profile] Token extracted, verifying..."); // Debugging
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log("[API/Profile] Unauthorized: Token verification failed."); // Debugging
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = decoded.userId;

    // Synthetic admin profile
    if (decoded.role === "admin") {
      const userProfile: UserProfile = {
        id: userId,
        email: "admin@example.com",
        fullName: "System Admin",
        role: "admin",
        classLevel: undefined,
        studentId: undefined,
        lockedDashboard: false,
        lockedExams: false,
        createdAt: new Date().toISOString(),
      }
      return NextResponse.json(userProfile)
    }
    console.log("[API/Profile] User ID:", userId); // Debugging

    console.log("[API/Profile] Fetching user document for ID:", userId); // Debugging
    const userDoc = await firestore.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.log("[API/Profile] User profile not found for ID:", userId); // Debugging
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userData = userDoc.data() as any;
    console.log("[API/Profile] User data found:", userData); // Debugging

    const userProfile: UserProfile = {
      id: userDoc.id,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role,
      classLevel: userData.classLevel || undefined,
      studentId: userData.studentId || undefined,
      lockedDashboard: !!userData.lockedDashboard,
      lockedExams: !!userData.lockedExams,
      createdAt: userData.createdAt,
    };
    console.log("[API/Profile] User profile prepared:", userProfile); // Debugging

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("[Firebase] Error fetching user profile:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

import { getAuth } from "firebase-admin/auth";
import { firestore } from "@/lib/firebaseAdmin"; // Import firestore
import { NextResponse } from "next/server"; // Import NextResponse

export async function GET(req) {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@example.com"; // Use ADMIN_EMAIL from .env

    const user = await getAuth().getUserByEmail(email);
    await getAuth().setCustomUserClaims(user.uid, { role: "admin" });

    // Update Firestore user document with the role
    await firestore.collection("users").doc(user.uid).set(
      { role: "admin" },
      { merge: true } // Merge to avoid overwriting other user data
    );

    return NextResponse.json({ success: true, message: `User ${email} set as admin.` });
  } catch (err) {
    console.error("Error setting admin role:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

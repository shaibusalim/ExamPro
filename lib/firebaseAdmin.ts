import admin from "firebase-admin";

let app: admin.app.App;

if (!admin.apps.length) {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64 && b64.trim().length > 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(b64, "base64").toString("utf8")
    );
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Initialize without explicit credentials to avoid build-time failure.
    // Runtime access to Firestore/Auth will still require proper credentials.
    app = admin.initializeApp();
  }
} else {
  app = admin.app();
}

export const firestore = app.firestore();
export const auth = app.auth();

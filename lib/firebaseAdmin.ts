import admin from "firebase-admin";

let app: admin.app.App;

if (!admin.apps.length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_BASE64 in environment variables");
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
  );

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  app = admin.app();
}

export const firestore = app.firestore();
export const auth = app.auth();

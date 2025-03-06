import * as admin from "firebase-admin";
import dotenv from "dotenv";

// ✅ Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
  throw new Error("❌ FIREBASE_ADMIN_CREDENTIALS is missing in .env file.");
}

let firebaseCredentials;
try {
  firebaseCredentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
  if (!firebaseCredentials.private_key) {
    throw new Error("❌ private_key is missing in FIREBASE_ADMIN_CREDENTIALS.");
  }
} catch (error) {
  console.error("❌ Error parsing FIREBASE_ADMIN_CREDENTIALS in send-fcm.util.ts:", error);
  process.exit(1);
}

// ✅ Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "axiom-528ab.appspot.com",
  });
}

export const sendFCM = async (message: admin.messaging.Message) => {
  try {
    await admin.messaging().send(message);
  } catch (error) {
    console.error("❌ FCM Error:", error);
  }
};

export default admin;

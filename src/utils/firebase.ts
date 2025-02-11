import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// ✅ Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });
// ✅ Load Firebase credentials from GitHub Secret
const firebaseCredentials =
  process.env.FIREBASE_ADMIN_CREDENTIALS ||
  process.env.NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_FILE_NAME;

if (!firebaseCredentials) {
  throw new Error(
    "❌ Firebase credentials are missing. Set FIREBASE_ADMIN_CREDENTIALS in GitHub Secrets."
  );
}

// ✅ Parse the secret JSON string
// const serviceAccount = JSON.parse(firebaseCredentials.replace(/\\n/g, "\n")); // Fix escaped newlines

// ✅ Get Service Account Key from JSON
const serviceAccountPath = path.resolve(
  __dirname,
  "../../../../Downloads/firebase-admin.json"
);

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `❌ Firebase service account file not found at ${serviceAccountPath}`
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// ✅ Prevent multiple initializations in hot-reloading environments
if (!admin.apps?.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // credential: admin.credential.applicationDefault(),
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "axiom-528ab.appspot.com",
  });
}
console.log("serviceAccount", serviceAccount);
// ✅ Get Firebase Storage Bucket
export const adminStorage = getStorage().bucket();

/**
 * 🔹 Upload a single file to Firebase Storage (Node.js Backend)
 * @param filePath Path to the file
 * @param destination Destination path in Firebase Storage
 * @returns Download URL of the uploaded file
 */
export const uploadFileToFirebase = async (
  filePath: string,
  destination: string
): Promise<string> => {
  if (!filePath) {
    throw new Error("❌ No file path provided for upload.");
  }

  try {
    const storageFile = adminStorage.file(destination);

    await storageFile.save(filePath, {
      metadata: {
        contentType: destination.includes("videos")
          ? "video/mp4"
          : "image/jpeg",
      },
      public: true, // ✅ Make file publicly accessible
    });

    // ✅ Generate and return the public URL
    const publicUrl = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${destination}`;
    console.log("✅ File uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("❌ Firebase Storage Upload Error:", error);
    throw error;
  }
};

export default admin;

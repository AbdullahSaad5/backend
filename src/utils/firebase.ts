import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";

// ✅ Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });
// console.log("NODE ENV HERE IN FIREBASE TS",process.env.NODE_ENV )
let firebaseCredentials;
try {
  const firebaseAdminCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;

  // console.log("without PARSE::", process.env.FIREBASE_ADMIN_CREDENTIALS);
  if (!firebaseAdminCredentials) {
    throw new Error("❌ FIREBASE_ADMIN_CREDENTIALS is not defined");
  }

  firebaseCredentials = JSON.parse(firebaseAdminCredentials);
  // console.log("with PARSE::", firebaseCredentials);

  if (!firebaseCredentials.private_key) {
    throw new Error("❌ private_key is missing in FIREBASE_ADMIN_CREDENTIALS.");
  }
  firebaseCredentials.private_key = firebaseCredentials.private_key.replace(
    /\\n/g,
    "\n"
  );
} catch (error) {
  console.error(
    "❌ Error parsing FIREBASE_ADMIN_CREDENTIALS in firebase.ts:",
    error
  );
  process.exit(1);
}
// ✅ Initialize Firebase if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials), // ✅ Use parsed object
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      "axiom-528ab.appspot.com",
  });
}
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
    // console.log("✅ File uploaded successfully:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("❌ Firebase Storage Upload Error:", error);
    throw error;
  }
};

export default admin;

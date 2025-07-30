import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getPresignedUrl } from "@aws-sdk/s3-request-presigner";
import multerS3 from "multer-s3";

// DigitalOcean Spaces configuration for London region
const s3Client = new S3Client({
  endpoint: "https://lon1.digitaloceanspaces.com",
  region: "lon1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

// Your DigitalOcean Space name
const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "build-my-rig";

// Multer-S3 configuration for DigitalOcean Spaces
export const digitalOceanSpacesStorage = multerS3({
  s3: s3Client,
  bucket: BUCKET_NAME,
  acl: "public-read",
  key: function (req, file, cb) {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split(".").pop();
    const filename = `${timestamp}-${randomString}.${fileExtension}`;

    // Organize files by type in folders
    let folder = "uploads";

    if (file.mimetype.startsWith("image/")) {
      folder = "images";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "videos";
    } else if (
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("document") ||
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("presentation")
    ) {
      folder = "documents";
    }

    cb(null, `${folder}/${filename}`);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata: function (req, file, cb) {
    cb(null, {
      fieldName: file.fieldname,
      originalName: file.originalname,
      uploadTime: new Date().toISOString(),
    });
  },
});

// Direct S3 client for additional operations
export { s3Client as s3, BUCKET_NAME };

// Utility functions for file operations using AWS SDK v3
export const deleteFileFromSpaces = async (fileKey: string): Promise<boolean> => {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
    console.log(`File deleted successfully: ${fileKey}`);
    return true;
  } catch (error) {
    console.error("Error deleting file from Spaces:", error);
    return false;
  }
};

export const getSignedUrl = async (fileKey: string, expires: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey });
  return await getPresignedUrl(s3Client, command, { expiresIn: expires });
};

export const listFilesInFolder = async (prefix: string = "") => {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix });
    const result = await s3Client.send(command);
    return result.Contents || [];
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
};

// Check if Spaces connection is working
export const testSpacesConnection = async (): Promise<boolean> => {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log("✅ DigitalOcean Spaces connection successful");
    return true;
  } catch (error) {
    console.error("❌ DigitalOcean Spaces connection failed:", error);
    return false;
  }
};

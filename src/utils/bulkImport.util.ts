import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { adminStorage, uploadFileToFirebase } from "./firebase";
import { Inventory, User } from "@/models";
import { Request, Response } from "express";
import Papa from "papaparse";
import dotenv from "dotenv";
import { inventoryService } from "@/services";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
const uploadToFirebase = async (filePath: string, destination: string): Promise<string | null> => {
  if (!filePath) throw new Error("No file provided!");
  try {
    const storageFile = adminStorage.file(destination);
    await storageFile.save(filePath, {
      metadata: {
        contentType: destination.includes("videos") ? "video/mp4" : "image/jpeg",
      },
      public: true,
    });
    console.log(`✅ Uploaded file to Firebase: ${destination}`);
    return `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${destination}`;
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    return null;
  }
};

const validateCsvData = async (csvFilePath: string) => {
  console.log(`📂 Validating CSV file: ${csvFilePath}`);
  const requiredColumns = ["brand", "title", "description", "productSupplierKey", "productCategory"];

  const csvContent = fs.readFileSync(csvFilePath, "utf8");
  const parsedCSV = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsedCSV.errors.length > 0) throw new Error(`CSV Parsing Errors: ${JSON.stringify(parsedCSV.errors)}`);

  const validRows: { row: number; data: any }[] = [];
  const invalidRows: { row: number; errors: string[] }[] = [];
  const validIndexes = new Set<number>();
  // console.log("📂 Parsed CSV Data:", parsedCSV.data);

  for (const [index, row] of (parsedCSV.data as any[]).entries()) {
    const errors: string[] = [];

    requiredColumns.forEach((col) => {
      if (!row[col]?.trim()) errors.push(`${col} is missing or empty`);
    });

    if (!row.costPrice || isNaN(parseFloat(row.costPrice))) errors.push("Price must be a valid number");

    if (row.productSupplierKey) {
      const supplier = await User.findOne({
        supplierKey: row.productSupplierKey,
      }).select("_id");
      if (!supplier) {
        errors.push(`supplierKey ${row.productSupplierKey} does not exist in the database`);
      } else {
        row.productSupplier = supplier._id;
      }
    } else {
      errors.push("productSupplierKey is required");
    }

    if (row.productCategory && !mongoose.isValidObjectId(row.productCategory))
      errors.push("productCategory must be a valid MongoDB ObjectId");
    if (row.productSupplier && !mongoose.isValidObjectId(row.productSupplier))
      errors.push("productSupplier must be a valid MongoDB ObjectId");
    if (errors.length > 0) {
      invalidRows.push({ row: index + 1, errors });
    } else {
      validRows.push({ row: index + 1, data: row });
      validIndexes.add(index + 1);
    }
  }

  console.log(`✅ Valid rows: ${validRows.length}, ❌ Invalid rows: ${invalidRows.length}`);
  return { validRows, invalidRows, validIndexes };
};

const processZipFile = async (zipFilePath: string) => {
  const extractPath = path.join(process.cwd(), "extracted");

  try {
    console.log(`📂 Processing ZIP file: ${zipFilePath}`);
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    zip.extractAllTo(extractPath, true);

    const extractedItems = fs.readdirSync(extractPath).filter((item) => item !== "__MACOSX");
    console.log("🔹 Extracted files:", extractedItems);

    const mainFolder =
      extractedItems.length === 1 && fs.lstatSync(path.join(extractPath, extractedItems[0])).isDirectory()
        ? path.join(extractPath, extractedItems[0])
        : extractPath;

    const files = fs.readdirSync(mainFolder);
    console.log("✅ Files inside extracted folder:", files);

    const csvFile = files.find((f) => f.endsWith(".csv"));
    const mediaFolder = files.find((f) => fs.lstatSync(path.join(mainFolder, f)).isDirectory());

    if (!csvFile || !mediaFolder) {
      throw new Error("Invalid ZIP structure. Missing CSV or media folder.");
    }

    console.log("✅ CSV File:", csvFile);
    console.log("✅ Media Folder:", mediaFolder);

    const csvFilePath = path.join(mainFolder, csvFile);
    const { validRows, validIndexes } = await validateCsvData(csvFilePath);

    if (validRows.length === 0) {
      console.log("❌ No valid rows found in CSV. Exiting.");
      return;
    }

    for (const [index, { data }] of validRows.entries()) {
      const folderIndex = (index + 1).toString();
      if (!validIndexes.has(index + 1)) continue;

      console.log(`📂 Processing media for row: ${folderIndex}`);
      const productMediaPath = path.join(mainFolder, mediaFolder, folderIndex);
      if (!fs.existsSync(productMediaPath)) continue;

      const uploadFiles = async (files: string[], destination: string) => {
        try {
          const uploads = files.map((file) => uploadFileToFirebase(file, `${destination}/${uuidv4()}`));

          const results = await Promise.allSettled(uploads);

          return results
            .filter((res) => res.status === "fulfilled")
            .map((res) => (res as PromiseFulfilledResult<string>).value);
        } catch (error) {
          console.error("❌ Error uploading files:", error);
          return [];
        }
      };

      const imagesFolder = path.join(productMediaPath, "images");
      // const videosFolder = path.join(productMediaPath, "videos");

      data.images = fs.existsSync(imagesFolder)
        ? await uploadFiles(
            fs.readdirSync(imagesFolder).map((f) => path.join(imagesFolder, f)),
            `products/${folderIndex}/images`
          )
        : [];

      // data.videos = fs.existsSync(videosFolder)
      //   ? await uploadFiles(
      //       fs.readdirSync(videosFolder).map((f) => path.join(videosFolder, f)),
      //       `products/${folderIndex}/videos`
      //     )
      //   : [];
    }

    console.log("🚀 Starting bulk import...");
    await inventoryService.bulkImportInventory(validRows);
    console.log(`✅ Bulk import completed.`);
  } catch (error) {
    console.error("❌ Error processing ZIP file:", error);
  } finally {
    try {
      if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        console.log("🗑️ Extracted files cleaned up.");
      }
      if (fs.existsSync(zipFilePath)) {
        // fs.unlinkSync(zipFilePath);
        console.log("🗑️ ZIP file deleted.");
      }
    } catch (err) {
      console.error("❌ Error cleaning up files:", err);
    }
  }
};

export { validateCsvData, processZipFile };

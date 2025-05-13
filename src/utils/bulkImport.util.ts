import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { adminStorage, uploadFileToFirebase } from "./firebase";
import { ProductCategory, User } from "@/models";
import Papa from "papaparse";
import dotenv from "dotenv";
import { ebayListingService, inventoryService } from "@/services";
import { addLog } from "./bulkImportLogs.util";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

export const bulkImportUtility = {
  uploadToFirebase: async (filePath: string, destination: string): Promise<string | null> => {
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
  },

  validateCsvData: async (csvFilePath: string) => {
    addLog(`📂 Validating CSV file: ${csvFilePath}`);
    const requiredColumns = [
      "brand",
      "title",
      "description",
      "productSupplierKey",
      "productCategory",
      "processor",
      "screenSize",
    ];

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

      if (row.productCategory) {
        const category = await ProductCategory.findOne({ name: row.productCategory }).select("_id");
        if (!category) {
          errors.push(`Product category '${row.productCategory}' does not exist in the database`);
        } else {
          row.productCategoryName = row.productCategory;
          row.productCategory = category._id;
          // Replace name with its ObjectId
        }
      } else {
        errors.push("productCategory is required");
      }

      if (row.productSupplier && !mongoose.isValidObjectId(row.productSupplier))
        errors.push("productSupplier must be a valid MongoDB ObjectId");
      if (errors.length > 0) {
        invalidRows.push({ row: index + 1, errors });
      } else {
        validRows.push({ row: index + 1, data: row });
        validIndexes.add(index + 1);
      }
    }

    addLog(`✅ Valid rows: ${validRows.length}, ❌ Invalid rows: ${invalidRows.length}`);
    return { validRows, invalidRows, validIndexes };
  },

  processZipFile: async (zipFilePath: string) => {
    const extractPath = path.join(process.cwd(), "extracted");

    try {
      addLog(`📂 Processing ZIP file: ${zipFilePath}`);
      if (!fs.existsSync(zipFilePath)) {
        addLog(`❌ ZIP file does not exist: ${zipFilePath}`);
        throw new Error(`ZIP file does not exist: ${zipFilePath}`);
      }

      const zip = new AdmZip(zipFilePath);
      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }
      zip.extractAllTo(extractPath, true);

      const extractedItems = fs.readdirSync(extractPath).filter((item) => item !== "__MACOSX");
      addLog(`🔹 Extracted files: ${extractedItems.join(", ")}`);

      const mainFolder =
        extractedItems.length === 1 && fs.lstatSync(path.join(extractPath, extractedItems[0])).isDirectory()
          ? path.join(extractPath, extractedItems[0])
          : extractPath;

      const files = fs.readdirSync(mainFolder);
      addLog(`✅ Files inside extracted folder: ${files.join(", ")}`);

      const csvFile = files.find((f) => f.endsWith(".csv"));
      const mediaFolder = files.find((f) => fs.lstatSync(path.join(mainFolder, f)).isDirectory());

      if (!csvFile || !mediaFolder) {
        addLog("❌ Invalid ZIP structure. Missing CSV or media folder.");
        throw new Error("Invalid ZIP structure. Missing CSV or media folder.");
      }

      addLog(`✅ CSV File: ${csvFile}`);
      addLog(`✅ Media Folder: ${mediaFolder}`);

      // Proceed with CSV validation and bulk import
      const { validRows, validIndexes, invalidRows } = await bulkImportUtility.validateCsvData(
        path.join(mainFolder, csvFile)
      );

      // Log invalid rows
      if (invalidRows.length > 0) {
        addLog(`❌ Invalid Rows Found: ${invalidRows.length}`);
        invalidRows.forEach((row) => {
          addLog(`Row ${row.row} failed: ${row.errors.join(", ")}`);
        });
      }

      if (validRows.length === 0) {
        addLog("❌ No valid rows found in CSV. Exiting.");
        return;
      }

      // Log the valid rows before processing
      addLog(`✅ Valid rows: ${validRows.length}`);
      validRows.forEach((row, index) => {
        addLog(`Row ${index + 1}: ${JSON.stringify(row.data)}`);
      });

      // Process media and files for valid rows
      for (const [index, { data }] of validRows.entries()) {
        const folderIndex = (index + 1).toString();
        if (!validIndexes.has(index + 1)) continue;

        addLog(`📂 Processing media for row: ${folderIndex}`);
        const productMediaPath = path.join(mainFolder, mediaFolder, folderIndex);
        if (!fs.existsSync(productMediaPath)) {
          addLog(`❌ No media found for row: ${folderIndex}`);
          continue;
        }

        const uploadFiles = async (files: string[], destination: string) => {
          if (!files || files.length === 0) {
            console.log(`❌ No files to upload for ${destination}`);
            return [];
          }
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
        data.images = fs.existsSync(imagesFolder)
          ? await uploadFiles(
              fs.readdirSync(imagesFolder).map((f) => path.join(imagesFolder, f)),
              `products/${folderIndex}/images`
            )
          : [];

        // Log the images for each row
        console.log("Images for row:", data.images);
      }

      addLog("🚀 Starting bulk import...");

      // Validate the structure of validRows before bulk import
      validRows.forEach((row, index) => {
        if (!row.data || !row.data.brand || !row.data.title) {
          console.error(`❌ Missing essential data in row ${index + 1}:`, row);
          addLog(`❌ Missing essential data in row ${index + 1}`);
        }
      });

      // Bulk import valid rows
      await inventoryService.bulkImportInventory(validRows);
      addLog("✅ Bulk import completed.");
    } catch (error: any) {
      addLog(`❌ Error processing ZIP file: ${error.message}`);
      console.error("Full error details:", error);
    } finally {
      try {
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          addLog("🗑️ Extracted files cleaned up.");
        }
        if (fs.existsSync(zipFilePath)) {
          // fs.unlinkSync(zipFilePath);
          console.log("🗑️ ZIP file deleted.");
        }
      } catch (err) {
        console.error("❌ Error cleaning up files:", err);
      }
    }
  },
  fetchAllCategoryIds: async (): Promise<string[]> => {
    try {
      // Execute the aggregation query
      const result = await ProductCategory.aggregate([
        {
          $match: {
            $or: [
              { ebayPartCategoryId: { $exists: true, $ne: null } },
              { ebayProductCategoryId: { $exists: true, $ne: null } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            ebayPartCategoryIds: { $addToSet: "$ebayPartCategoryId" },
            ebayProductCategoryIds: { $addToSet: "$ebayProductCategoryId" },
          },
        },
        {
          $project: {
            _id: 0,
            allCategoryIds: { $setUnion: ["$ebayPartCategoryIds", "$ebayProductCategoryIds"] },
          },
        },
      ]);

      // If the result is empty, return an empty array
      if (result.length === 0) {
        return [];
      }

      // Return the array of all unique category IDs
      return result[0].allCategoryIds;
    } catch (error) {
      console.error("Error fetching category IDs:", error);
      throw new Error("Failed to fetch category IDs");
    }
  },

  fetchAspectsForAllCategories: async () => {
    try {
      // Get all category IDs
      const categoryIds = await bulkImportUtility.fetchAllCategoryIds();
      console.log("categoryIDs", categoryIds);
      if (categoryIds.length === 0) {
        console.log("No category IDs found.");
        return;
      }

      // Fetch aspects for each category
      const categoryAspectsPromises = categoryIds.map(async (categoryId) => {
        const aspects = await ebayListingService.fetchEbayCategoryAspects(categoryId);
        return {
          categoryId,
          aspects,
        };
      });

      // Wait for all promises to resolve
      const allCategoryAspects = await Promise.all(categoryAspectsPromises);

      // Return the result with aspects for each category
      console.log("All Category Aspects:", allCategoryAspects);
      return allCategoryAspects;
    } catch (error) {
      console.error("Error fetching aspects for all categories:", error);
      throw error;
    }
  },
};

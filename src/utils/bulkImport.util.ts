import fs from "fs";
import * as XLSX from "xlsx";
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
  validateXLSXData: async (workbook: XLSX.WorkBook, mediaFolderPath: string) => {
    const sheetNames = workbook.SheetNames;
    const validRows: { row: number; data: any }[] = [];
    const invalidRows: { row: number; errors: string[] }[] = [];
    const validIndexes = new Set<number>();

    for (const sheetName of sheetNames) {
      const sheetMatch = sheetName.match(/^(.*)\s+\((\d+)\)$/);
      if (!sheetMatch) {
        addLog(`❌ Invalid sheet name format: "${sheetName}". Use "name (number)"`);
        continue;
      }

      const [_, categoryName, categoryId] = sheetMatch;
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

      if (data.length < 2) continue;

      const [headerRow, ...rows]: any = data;

      const requiredIndexes: number[] = [];
      const variationAllowedIndexes: number[] = [];
      const requiredFields = new Set<string>();
      const variationFields = new Set<string>();

      const cleanedHeaders = headerRow.map((h: string, idx: number) => {
        if (typeof h !== "string") return h;

        let clean = h.trim();
        if (clean.endsWith("*")) {
          clean = clean.replace("*", "").trim();
          requiredIndexes.push(idx);
          requiredFields.add(clean);
        }

        if (/\(variation allowed\)/i.test(clean)) {
          clean = clean.replace(/\(variation allowed\)/i, "").trim();
          variationAllowedIndexes.push(idx);
          variationFields.add(clean);
        }

        return clean;
      });

      let sheetValidCount = 0;
      let sheetInvalidCount = 0;

      for (const [index, row] of rows.entries()) {
        const errors: string[] = [];

        // Check required fields
        requiredIndexes.forEach((reqIdx) => {
          const val = (row[reqIdx] ?? "").toString().trim();
          if (!val) {
            errors.push(`Missing required field "${cleanedHeaders[reqIdx]}"`);
          }
        });

        const rowObj: Record<string, any> = {};

        cleanedHeaders.forEach((key: string, idx: number) => {
          const rawValue = row[idx];

          if (variationFields.has(key)) {
            if (typeof rawValue === "string" && rawValue.trim()) {
              rowObj[key] = rawValue
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean);
            } else {
              rowObj[key] = [];
            }
          } else {
            rowObj[key] = rawValue?.toString().trim() ?? "";
          }
        });

        // Inject category metadata
        rowObj.productCategoryName = categoryName.trim();
        rowObj.productCategory = categoryId;
        rowObj.ebayCategoryId = categoryId;

        // Validate supplier
        const supplierKey = rowObj["productSupplierKey"];
        if (!supplierKey) {
          errors.push("productSupplierKey is required");
        } else {
          const supplier = await User.findOne({ supplierKey }).select("_id");
          if (!supplier) {
            errors.push(`supplierKey ${supplierKey} does not exist in DB`);
          } else {
            rowObj.productSupplier = supplier._id;
          }
        }

        if (!rowObj.costPrice || isNaN(parseFloat(rowObj.costPrice))) {
          errors.push("Price must be a valid number");
        }

        const globalRowIndex = validRows.length + invalidRows.length + 1;

        if (errors.length > 0) {
          invalidRows.push({ row: globalRowIndex, errors });
          sheetInvalidCount++;
        } else {
          // Upload media if available
          const mediaBasePath = path.join(mediaFolderPath, sheetName, String(index + 1));
          const imageFolderPath = path.join(mediaBasePath, "images");
          const videoFolderPath = path.join(mediaBasePath, "videos");

          const uploadedImages: string[] = [];
          const uploadedVideos: string[] = [];

          if (fs.existsSync(imageFolderPath)) {
            const imageFiles = fs.readdirSync(imageFolderPath);
            for (const file of imageFiles) {
              const filePath = path.join(imageFolderPath, file);
              const destination = `bulk/${sheetName}/${index + 1}/images/${file}`;
              const url = await uploadFileToFirebase(filePath, destination);
              uploadedImages.push(url);
            }
          }

          if (fs.existsSync(videoFolderPath)) {
            const videoFiles = fs.readdirSync(videoFolderPath);
            for (const file of videoFiles) {
              const filePath = path.join(videoFolderPath, file);
              const destination = `bulk/${sheetName}/${index + 1}/videos/${file}`;
              const url = await uploadFileToFirebase(filePath, destination);
              uploadedVideos.push(url);
            }
          }

          rowObj.images = uploadedImages;
          rowObj.videos = uploadedVideos;

          validRows.push({ row: globalRowIndex, data: rowObj });
          validIndexes.add(globalRowIndex);
          sheetValidCount++;
        }
      }

      if (sheetValidCount > 0 || sheetInvalidCount > 0) {
        addLog(`📄 Sheet "${sheetName}": ✅ ${sheetValidCount} valid, ❌ ${sheetInvalidCount} invalid`);
        invalidRows.slice(-sheetInvalidCount).forEach((rowInfo) => {
          addLog(`    ❌ Row ${rowInfo.row} error(s): ${rowInfo.errors.join(", ")}`);
        });
      }
    }

    addLog(`🧪 Final Validation: ✅ ${validRows.length} valid, ❌ ${invalidRows.length} invalid`);
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

      const xlsxFile = files.find((f) => f.endsWith(".xlsx"));
      const mediaFolder = files.find(
        (f) => fs.lstatSync(path.join(mainFolder, f)).isDirectory() && f.toLowerCase().includes("media")
      );

      if (!xlsxFile || !mediaFolder) {
        addLog("❌ Invalid ZIP structure. Missing XLSX or media folder.");
        throw new Error("Invalid ZIP structure. Missing XLSX or media folder.");
      }

      const xlsxPath = path.join(mainFolder, xlsxFile);
      const mediaFolderPath = path.join(mainFolder, mediaFolder);

      addLog(`✅ XLSX File: ${xlsxFile}`);
      addLog(`✅ Media Folder: ${mediaFolder}`);

      const workbook = XLSX.readFile(xlsxPath);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        addLog("❌ XLSX file has no sheets.");
        throw new Error("XLSX file has no sheets.");
      }

      addLog(`📄 Found worksheets: ${sheetNames.join(", ")}`);

      // ✅ Pass workbook and media folder to validator
      const { validRows, invalidRows, validIndexes } = await bulkImportUtility.validateXLSXData(
        workbook,
        mediaFolderPath
      );

      // Use validRows as needed (e.g., for database upload)
      console.log("✅ Valid Rows Ready:", validRows.length);
      console.log("❌ Invalid Rows:", invalidRows.length);

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

  fetchAllCategoryIds: async (): Promise<{ id: string; name: string }[]> => {
    try {
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
          $project: {
            _id: 0,
            name: 1,
            ebayPartCategoryId: 1,
            ebayProductCategoryId: 1,
          },
        },
      ]);

      // Build array of { id, name } from both possible ID fields
      const allCategories = result.flatMap((item) => {
        const categories: { id: string; name: string }[] = [];
        if (item.ebayPartCategoryId) {
          categories.push({ id: item.ebayPartCategoryId.toString(), name: item.name });
        }
        if (item.ebayProductCategoryId) {
          categories.push({ id: item.ebayProductCategoryId.toString(), name: item.name });
        }
        return categories;
      });

      return allCategories;
    } catch (error) {
      console.error("Error fetching category IDs:", error);
      throw new Error("Failed to fetch category IDs");
    }
  },

  fetchAspectsForAllCategories: async () => {
    try {
      // Step 1: Get all category ID-name pairs
      const categoryIdNamePairs = await bulkImportUtility.fetchAllCategoryIds(); // [{ id, name }]
      if (categoryIdNamePairs.length === 0) {
        console.log("No category IDs found.");
        return;
      }

      // Step 2: Fetch aspects for each category using Promise.allSettled
      const results = await Promise.allSettled(
        categoryIdNamePairs.map(async ({ id, name }) => {
          const aspects = await ebayListingService.fetchEbayCategoryAspects(id);
          return { categoryId: id, categoryName: name, aspects };
        })
      );

      // Step 3: Filter fulfilled
      const fulfilledResults = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            categoryId: string;
            categoryName: string;
            aspects: any;
          }> => result.status === "fulfilled" && !!result.value?.categoryId
        )
        .map((result) => result.value);

      // Step 4: Log rejected ones
      const failedCategories = results
        .map((res, index) => ({ res, index }))
        .filter(({ res }) => res.status === "rejected")
        .map(({ index }) => categoryIdNamePairs[index].id);

      if (failedCategories.length > 0) {
        console.warn("Some categories failed to fetch aspects:", failedCategories);
      }

      // Step 5: Export to Excel with names and aspects
      bulkImportUtility.exportCategoryAspectsToExcel(fulfilledResults);

      return fulfilledResults;
    } catch (error) {
      console.error("Error fetching aspects for all categories:", error);
      throw error;
    }
  },

  exportCategoryAspectsToExcel: async (
    allCategoryAspects: { categoryId: string; categoryName: string; aspects: any }[],
    filePath: string = "CategoryAspects.xlsx"
  ) => {
    const workbook = XLSX.utils.book_new();

    allCategoryAspects.forEach(({ categoryId, categoryName, aspects }) => {
      const aspectList = aspects?.aspects || [];

      const uniqueHeaders = new Set<string>();

      // Add static required fields first
      const staticHeaders = ["Title*", "Description*", "inventoryCondition*", "Brand*"];
      staticHeaders.forEach((header) => uniqueHeaders.add(header));

      // Add dynamic headers with required & variation flags
      aspectList.forEach((aspect: any) => {
        let title = aspect.localizedAspectName || "Unknown";
        const isRequired = aspect.aspectConstraint?.aspectRequired;
        const isVariation = aspect.aspectConstraint?.aspectEnabledForVariations;

        if (isRequired) title += "*";
        if (isVariation) title += " (variation allowed)";

        uniqueHeaders.add(title);
      });

      const headers = Array.from(uniqueHeaders);
      const data = [headers]; // first row is header

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Safe Excel sheet name: CategoryName (CategoryId)
      let sheetName = `${categoryName} (${categoryId})`;
      sheetName = sheetName.replace(/[\\/?*[\]:]/g, "").slice(0, 31); // Excel sheet name rules

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, filePath);
    console.log(`✅ Excel file generated: ${filePath}`);
  },
};

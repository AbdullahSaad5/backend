import fs from "fs";
import * as XLSX from "xlsx";
import path from "path";
import AdmZip from "adm-zip";
import { uploadFileToFirebase } from "./firebase";
import { ProductCategory } from "@/models/product-category.model";

import dotenv from "dotenv";
import { inventoryService } from "@/services";
import { addLog } from "./bulkImportLogs.util";
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

interface NestedStructure {
  [key: string]: any;
}

interface ColumnInfo {
  originalHeader: string;
  cleanedHeader: string;
  isRequired: boolean;
  isVariationAllowed: boolean;
  path: string[];
  rootAttribute: string;
}

export const bulkImportUtility = {
  // Helper function to validate if a product category ID is valid
  isValidProductCategory: async (categoryId: string): Promise<boolean> => {
    try {
      const category = await ProductCategory.findOne({
        amazonCategoryId: categoryId,
      });
      return !!category;
    } catch (error) {
      console.error(`Error validating category ID ${categoryId}:`, error);
      return false;
    }
  },

  // Helper function to parse column headers and extract nested paths
  parseColumnHeaders: (headers: string[]): ColumnInfo[] => {
    return headers.map((header, index) => {
      if (typeof header !== "string") {
        return {
          originalHeader: header,
          cleanedHeader: header,
          isRequired: false,
          isVariationAllowed: false,
          path: [header],
          rootAttribute: header,
        };
      }

      let cleaned = header.trim();
      const isRequired = cleaned.endsWith("*");
      const isVariationAllowed = /\(variation allowed\)/i.test(cleaned);

      // Remove markers
      if (isRequired) {
        cleaned = cleaned.replace("*", "").trim();
      }
      if (isVariationAllowed) {
        cleaned = cleaned.replace(/\(variation allowed\)/i, "").trim();
      }

      // Split by dots to get nested path
      const path = cleaned
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
      const rootAttribute = path[0] || cleaned;

      return {
        originalHeader: header,
        cleanedHeader: cleaned,
        isRequired,
        isVariationAllowed,
        path,
        rootAttribute,
      };
    });
  },

  // Helper function to set nested value in object
  setNestedValue: (obj: any, path: string[], value: any, isArray: boolean = false) => {
    let current = obj;

    // Navigate to the parent of the final property
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }

    // Set the final value
    const finalKey = path[path.length - 1];
    if (isArray && Array.isArray(value)) {
      current[finalKey] = value;
    } else {
      current[finalKey] = value;
    }
  },

  // Helper function to build nested object structure from row data
  buildNestedObject: (rowData: any[], columnInfos: ColumnInfo[]): NestedStructure => {
    const result: NestedStructure = {};
    const attributeGroups: { [key: string]: any } = {};

    // Group columns by root attribute
    columnInfos.forEach((colInfo, index) => {
      const value = rowData[index];
      const { rootAttribute, path, isVariationAllowed } = colInfo;

      if (!attributeGroups[rootAttribute]) {
        attributeGroups[rootAttribute] = {};
      }

      // Handle variation allowed fields as arrays
      if (isVariationAllowed && typeof value === "string" && value.trim()) {
        const arrayValue = value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        bulkImportUtility.setNestedValue(attributeGroups[rootAttribute], path.slice(1), arrayValue, true);
      } else {
        const processedValue = value?.toString().trim() ?? "";
        if (processedValue) {
          bulkImportUtility.setNestedValue(attributeGroups[rootAttribute], path.slice(1), processedValue);
        }
      }
    });

    // Convert grouped data to array of objects format
    Object.keys(attributeGroups).forEach((rootAttr) => {
      const attrData = attributeGroups[rootAttr];

      // Check if this attribute has nested structure
      if (Object.keys(attrData).length > 0) {
        // Convert to array of objects format
        result[rootAttr] = [attrData];
      }
    });

    return result;
  },

  // First validate sheet names and filter only valid ones
  validateSheetNames: async (sheetNames: string[]) => {
    const validSheets: { name: string; categoryId: string; categoryName: string }[] = [];
    const invalidSheets: { name: string; reason: string }[] = [];

    for (const sheetName of sheetNames) {
      // Extract category ID from parentheses
      const match = sheetName.trim().match(/\(([^)]+)\)/);

      if (!match) {
        invalidSheets.push({
          name: sheetName,
          reason: "Invalid format - must contain category ID in parentheses like 'name(CATEGORY_ID)'",
        });
        continue;
      }

      const categoryId = match[1].trim();

      // Validate if the category ID exists in database
      if (!(await bulkImportUtility.isValidProductCategory(categoryId))) {
        invalidSheets.push({
          name: sheetName,
          reason: `Invalid product category ID: "${categoryId}"`,
        });
        continue;
      }

      // Extract category name (everything before the parentheses)
      const categoryName = sheetName.replace(/\([^)]+\)/, "").trim();

      validSheets.push({
        name: sheetName,
        categoryId,
        categoryName,
      });
    }

    // Log results
    addLog(`📊 Sheet Validation Results:`);
    addLog(`✅ Valid sheets: ${validSheets.length}`);
    validSheets.forEach((sheet) => {
      addLog(`  - "${sheet.name}" (Category: ${sheet.categoryId})`);
    });

    addLog(`❌ Invalid sheets: ${invalidSheets.length}`);
    invalidSheets.forEach((sheet) => {
      addLog(`  - "${sheet.name}": ${sheet.reason}`);
    });

    return { validSheets, invalidSheets };
  },

  // Process only valid sheets and extract data
  validateXLSXData: async (workbook: XLSX.WorkBook, mediaFolderPath: string) => {
    const sheetNames = workbook.SheetNames;
    const validRows: { row: number; data: any }[] = [];
    const invalidRows: { row: number; errors: string[] }[] = [];
    const validIndexes = new Set<number>();

    // First, validate sheet names and get only valid ones
    const { validSheets, invalidSheets } = await bulkImportUtility.validateSheetNames(sheetNames);

    if (validSheets.length === 0) {
      addLog("❌ No valid sheets found to process.");
      return { validRows, invalidRows, validIndexes };
    }

    // Process only valid sheets
    for (const sheetInfo of validSheets) {
      const { name: sheetName, categoryId, categoryName } = sheetInfo;

      addLog(`📄 Processing valid sheet: "${sheetName}"`);

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

      if (data.length < 2) {
        addLog(`⚠️ Sheet "${sheetName}": No data rows found`);
        continue;
      }

      const [headerRow, ...rows]: any = data;

      // Parse column headers to understand nested structure
      const columnInfos = bulkImportUtility.parseColumnHeaders(headerRow);

      // Get required columns
      const requiredColumns = columnInfos.filter((col) => col.isRequired);

      let sheetValidCount = 0;
      let sheetInvalidCount = 0;

      for (const [index, row] of rows.entries()) {
        const errors: string[] = [];

        // Validate required fields
        requiredColumns.forEach((colInfo) => {
          const colIndex = columnInfos.findIndex((c) => c.originalHeader === colInfo.originalHeader);
          const val = (row[colIndex] ?? "").toString().trim();
          if (!val) {
            errors.push(`Missing required field "${colInfo.cleanedHeader}"`);
          }
        });

        const globalRowIndex = validRows.length + invalidRows.length + 1;

        if (errors.length > 0) {
          invalidRows.push({ row: globalRowIndex, errors });
          sheetInvalidCount++;
          continue;
        }

        // Build nested object structure and convert to array format expected by DB
        const nestedData = bulkImportUtility.buildNestedObject(row, columnInfos);

        // Add category information
        nestedData.productCategoryName = categoryName;
        nestedData.productCategory = categoryId;

        // Find matching media folder
        const matchingFolder = fs.readdirSync(mediaFolderPath).find((folder) => folder.includes(categoryId));

        if (!matchingFolder) {
          const errorMessage = `Media folder not found for category ID: ${categoryId}`;
          console.warn(`⚠️ ${errorMessage}`);
          addLog(`    ❌ Row ${globalRowIndex} error(s): ${errorMessage}`);
          invalidRows.push({ row: globalRowIndex, errors: [errorMessage] });
          sheetInvalidCount++;
          continue;
        }

        const mediaBasePath = path.join(mediaFolderPath, matchingFolder, String(index + 1));
        const imageFolderPath = path.join(mediaBasePath, "images");
        const videoFolderPath = path.join(mediaBasePath, "videos");

        const uploadedImages: string[] = [];
        const uploadedVideos: string[] = [];

        // Upload images
        if (fs.existsSync(imageFolderPath)) {
          const imageFiles = fs.readdirSync(imageFolderPath);
          for (const file of imageFiles) {
            const filePath = path.join(imageFolderPath, file);
            const destination = `bulk/${sheetName}/${index + 1}/images/${file}`;
            const url = await uploadFileToFirebase(filePath, destination);
            uploadedImages.push(url);
          }
        }

        // Upload videos
        if (fs.existsSync(videoFolderPath)) {
          const videoFiles = fs.readdirSync(videoFolderPath);
          for (const file of videoFiles) {
            const filePath = path.join(videoFolderPath, file);
            const destination = `bulk/${sheetName}/${index + 1}/videos/${file}`;
            const url = await uploadFileToFirebase(filePath, destination);
            uploadedVideos.push(url);
          }
        }

        // Add media to nested structure in array format
        if (uploadedImages.length > 0) {
          nestedData.images = uploadedImages.map((url) => ({
            value: url,
            marketplace_id: "A1F83G8C2ARO7P", // Default marketplace_id
          }));
        }

        if (uploadedVideos.length > 0) {
          nestedData.videos = uploadedVideos.map((url) => ({
            value: url,
            marketplace_id: "A1F83G8C2ARO7P", // Default marketplace_id
          }));
        }

        validRows.push({ row: globalRowIndex, data: nestedData });
        validIndexes.add(globalRowIndex);
        sheetValidCount++;
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

      const isValidExcel = (filename: string) => {
        return (
          filename.endsWith(".xlsx") &&
          !filename.startsWith("._") && // macOS metadata
          !filename.startsWith(".~") && // Excel temp file
          !filename.startsWith(".") // Hidden files like .DS_Store
        );
      };

      const xlsxFile = files.find(isValidExcel);
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

      const workbook = XLSX.readFile(xlsxPath, {
        type: "file",
        cellDates: true,
        raw: false,
        WTF: true,
      });

      const sheetNames = workbook.SheetNames;
      addLog(`📄 Found worksheets: ${sheetNames.join(", ")}`);

      if (sheetNames.length === 0) {
        addLog("❌ XLSX file has no sheets.");
        throw new Error("XLSX file has no sheets.");
      }

      let allValidRows: any = [];
      let allInvalidRows: any = [];

      for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          continue;
        }

        addLog(`📄 Processing sheet: "${sheetName}" with ${rows.length} rows`);

        const partialWorkbook = { Sheets: { [sheetName]: sheet }, SheetNames: [sheetName] };
        const { validRows, invalidRows } = await bulkImportUtility.validateXLSXData(partialWorkbook, mediaFolderPath);

        allValidRows = allValidRows.concat(validRows);
        allInvalidRows = allInvalidRows.concat(invalidRows);
      }

      console.log("✅ Total Valid Rows Ready:", allValidRows.length);
      console.log("❌ Total Invalid Rows:", allInvalidRows.length);

      if (allValidRows.length === 0) {
        addLog("❌ No valid Inventory to import.");
      } else {
        addLog("🚀 Starting bulk import...");
        await inventoryService.bulkImportInventory(allValidRows);
        addLog("✅ Bulk import completed.");
      }
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
};

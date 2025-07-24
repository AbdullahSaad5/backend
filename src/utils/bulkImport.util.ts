import fs from "fs";
import * as XLSX from "xlsx";
import path from "path";
import AdmZip from "adm-zip";
import { uploadFileToFirebase } from "./firebase";
import { ProductCategory } from "@/models";

import dotenv from "dotenv";
import { ebayListingService, inventoryService } from "@/services";
import { addLog } from "./bulkImportLogs.util";
import { bulkImportStandardTemplateGenerator } from "./bulkImportStandardTemplateGenerator.util";
import { validate } from "@/utils/validate";
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
export const bulkImportUtility = {
  validateXLSXData: async (
    workbook: XLSX.WorkBook
  ): Promise<{
    validRows: { row: number; data: any }[];
    invalidRows: { row: number; errors: string[] }[];
    validIndexes: Set<number>;
  }> => {
    const sheetNames = workbook.SheetNames;
    const validRows: { row: number; data: any }[] = [];
    const invalidRows: { row: number; errors: string[] }[] = [];
    const validIndexes = new Set<number>();

    const categoryVariationAspects: { [key: string]: string[] } = {
      PERSONAL_COMPUTER: [
        "processor_description",
        "hard_disk.size",
        "display.size",
        "memory_storage_capacity",
        "computer_memory.size",
      ],
      LAPTOP: [
        "processor_description",
        "hard_disk.size",
        "display.size",
        "memory_storage_capacity",
        "computer_memory.size",
      ],
      MONITOR: ["display.size", "display.resolution"],
      MOBILE_PHONE: ["memory_storage_capacity", "display.size", "color"],
      TABLET: ["memory_storage_capacity", "display.size", "color"],
      HEADPHONES: ["color", "connection_type"],
      CAMERA: ["color", "memory_storage_capacity"],
    };

    for (const sheetName of sheetNames) {
      // Match sheet name with format "Name (ID)"
      let match = sheetName.trim().match(/^(.+?)\s*\((.+?)\)\s*$/);

      // Optional auto-correct fallback
      if (!match && sheetName.includes("(")) {
        const parts = sheetName.split("(");
        if (parts.length === 2 && parts[1].includes(")")) {
          const id = parts[1].replace(/\)/g, "").trim();
          const correctedName = `${parts[0].trim()} (${id})`;
          console.log(`⚠️ Auto-corrected sheet name: "${sheetName}" → "${correctedName}"`);
          match = correctedName.match(/^(.+?)\s*\((.+?)\)\s*$/);
        }
      }

      if (!match) {
        console.log(`❌ Invalid sheet name format: "${sheetName}". Use "Name (ID)"`);
        continue;
      }

      const [_, categoryName, categoryId] = match;

      // Validate categoryId against database
      const matchedCategory = await ProductCategory.findOne({
        amazonCategoryId: categoryId.trim(),
      });
      if (!matchedCategory) {
        console.log(`❌ No matching category found in database for ID: "${categoryId}" in sheet: "${sheetName}"`);
        continue;
      }

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

      // Get Amazon schema for the category
      const amazonSchema = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(categoryId);
      const categoryKey = matchedCategory.name?.toUpperCase() || categoryName?.toUpperCase();
      const variationAspects = categoryVariationAspects[categoryKey] || [];

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

        // Transform row data into the required format
        const rowObj = await bulkImportUtility.transformRowData(
          row,
          cleanedHeaders,
          variationFields,
          categoryId,
          categoryName
        );

        // Validate transformed data against schema
        const validationResult: any = await validate(amazonSchema, rowObj, variationAspects);
        if (!validationResult.valid) {
          errors.push(...validationResult.errors);
        }

        const globalRowIndex = validRows.length + invalidRows.length + 1;

        if (errors.length > 0) {
          invalidRows.push({ row: globalRowIndex, errors });
          sheetInvalidCount++;
        } else {
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

  processXLSXFile: async (xlsxFilePath: string) => {
    try {
      addLog(`📄 Processing XLSX file: ${xlsxFilePath}`);

      if (!fs.existsSync(xlsxFilePath)) {
        addLog(`❌ XLSX file does not exist: ${xlsxFilePath}`);
        throw new Error(`XLSX file does not exist: ${xlsxFilePath}`);
      }

      const workbook = XLSX.readFile(xlsxFilePath, {
        type: "file",
        cellDates: true,
        raw: false,
        WTF: true,
      });

      const sheetNames = workbook.SheetNames;

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
          addLog(`📄 Skipping empty sheet: "${sheetName}"`);
          continue;
        }

        // Validate sheet before processing
        const partialWorkbook = { Sheets: { [sheetName]: sheet }, SheetNames: [sheetName] };
        const { validRows, invalidRows } = await bulkImportUtility.validateXLSXData(partialWorkbook);

        // Skip sheet if it has no valid rows and was marked invalid (e.g., invalid name or no matching category)
        if (validRows.length === 0 && invalidRows.length === 0) {
          addLog(`📄 Skipping invalid sheet: "${sheetName}"`);
          continue;
        }

        addLog(`📄 Processing sheet: "${sheetName}" with ${rows.length} rows`);

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
      addLog(`❌ Error processing XLSX file: ${error.message}`);
      console.error("Full error details:", error);
    }
  },

  transformRowData: async (
    row: any[],
    headers: string[],
    variationFields: Set<string>,
    categoryId: string,
    categoryName: string
  ): Promise<Record<string, any>> => {
    const rowObj: Record<string, any> = {};

    // Process headers to identify nested fields (e.g., brand.name, brand.value)
    const nestedFields: Record<string, { name: string; value: string }[]> = {};

    headers.forEach((header: string, idx: number) => {
      const cleanHeader = header.trim();
      const rawValue = row[idx] ?? "";

      // Handle variation fields (split into arrays)
      if (variationFields.has(cleanHeader)) {
        if (typeof rawValue === "string" && rawValue.trim()) {
          rowObj[cleanHeader] = rawValue
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        } else {
          rowObj[cleanHeader] = [];
        }
        return;
      }

      // Handle nested fields (e.g., brand.name, brand.value)
      if (cleanHeader.includes(".")) {
        const [parent, child] = cleanHeader.split(".");
        if (!nestedFields[parent]) {
          nestedFields[parent] = [];
        }
        const existingEntry = nestedFields[parent].find((entry) => entry.name === child);
        if (!existingEntry) {
          nestedFields[parent].push({ name: child, value: rawValue?.toString().trim() ?? "" });
        }
        return;
      }

      // Handle regular fields
      rowObj[cleanHeader] = rawValue?.toString().trim() ?? "";
    });

    // Convert nested fields into the required format (e.g., brand: [{ name: "", value: "" }])
    Object.keys(nestedFields).forEach((parent) => {
      rowObj[parent] = nestedFields[parent];
    });

    // Add category information
    rowObj.productCategoryName = categoryName.trim();
    rowObj.productCategory = categoryId.trim();

    return rowObj;
  },
};

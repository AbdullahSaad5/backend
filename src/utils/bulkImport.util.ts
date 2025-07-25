import fs from "fs";
import * as XLSX from "xlsx";
import { ProductCategory } from "@/models";

import dotenv from "dotenv";
import { inventoryService } from "@/services";
import { addLog } from "./bulkImportLogs.util";
import { bulkImportStandardTemplateGenerator } from "./bulkImportStandardTemplateGenerator.util";
import { validate } from "@/utils/validate";
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
export const bulkImportUtility = {
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
          // addLog(`📄 Skipping empty sheet: "${sheetName}"`);
          continue;
        }

        // Validate sheet before processing
        const partialWorkbook = { Sheets: { [sheetName]: sheet }, SheetNames: [sheetName] };
        const { validRows, invalidRows } = await bulkImportUtility.validateXLSXData(partialWorkbook);

        // Skip sheet if it has no valid rows and was marked invalid (e.g., invalid name or no matching category)
        if (validRows.length === 0 && invalidRows.length === 0) {
          // addLog(`📄 Skipping invalid sheet: "${sheetName}"`);
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

    // console.log(`📚 Starting validation for workbook with ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`);

    for (const sheetName of sheetNames) {
      // console.log(`\n📄 Processing sheet: "${sheetName}"`);

      let match = sheetName.trim().match(/^(.+?)\s*\((.+?)\)\s*$/);

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
        // console.log(`❌ Invalid sheet name format: "${sheetName}". Use "Name (ID)"`);
        continue;
      }

      const [_, categoryName, categoryId] = match;
      // console.log(`🔍 Extracted categoryName: "${categoryName}", categoryId: "${categoryId}"`);

      const matchedCategory = await ProductCategory.findOne({
        amazonCategoryId: categoryId.trim(),
      });
      if (!matchedCategory) {
        console.log(`❌ No matching category found in database for ID: "${categoryId}" in sheet: "${sheetName}"`);
        continue;
      }
      // console.log(`✅ Category "${categoryName}" (ID: ${categoryId}) found in database`);

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

      if (data.length < 2) {
        console.log(`⚠️ Sheet "${sheetName}" has no data rows (requires at least header and one data row)`);
        continue;
      }

      const [headerRow, ...rows]: any = data;
      // console.log(`📋 Sheet "${sheetName}" headers: ${headerRow.join(", ")}`);
      // console.log(`📊 Processing ${rows.length} data row(s) in sheet "${sheetName}"`);

      const amazonSchema = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(categoryId);
      const variationAspects = categoryVariationAspects[categoryId] || [];
      console.log(`🔧 Variation aspects for category "${categoryId}": ${variationAspects.join(", ") || "none"}`);

      const variationFields = new Set<string>(variationAspects);

      let sheetValidCount = 0;
      let sheetInvalidCount = 0;

      for (const [index, row] of rows.entries()) {
        const globalRowIndex = validRows.length + invalidRows.length + 1;
        // console.log(`\n🔄 Processing row      console.log(`\n🔄 Processing row ${globalRowIndex} (sheet row ${index + 2})`);

        const isRowEmpty = row.every(
          (cell: any) => cell === "" || cell == null || (typeof cell === "string" && cell.trim() === "")
        );
        if (isRowEmpty) {
          // console.log(`⚠️ Skipping empty row ${globalRowIndex} (sheet row ${index + 2})`);
          continue;
        }

        // console.log(`📥 Raw row data: ${JSON.stringify(row)}`);
        const errors: string[] = [];

        const rowObj = await bulkImportUtility.transformRowData(
          row,
          headerRow,
          variationFields,
          categoryId,
          categoryName
        );
        console.log(`📤 Transformed row data: ${JSON.stringify(rowObj, null, 2)}`);

        const validationResult: any = await validate(amazonSchema, rowObj, variationAspects);
        if (!validationResult.valid) {
          const errorMessages = validationResult.errors.map((error: any) => error.message || "Unknown error");
          errors.push(...errorMessages);
          console.log(`❌ Validation errors for row ${globalRowIndex}: ${errorMessages.join(", ")}`);
          addLog(`❌ Validation errors for row ${globalRowIndex}: ${errorMessages.join(", ")}`);
        } else {
          console.log(`✅ Row ${globalRowIndex} passed validation`);
        }

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
        // console.log(`📄 Sheet "${sheetName}" summary: ✅ ${sheetValidCount} valid, ❌ ${sheetInvalidCount} invalid`);
        invalidRows.slice(-sheetInvalidCount).forEach((rowInfo) => {
          // console.log(`    ❌ Row ${rowInfo.row} error(s): ${rowInfo.errors.join(", ")}`);
        });
      }
    }

    // console.log(`\n🧪 Final Validation Summary: ✅ ${validRows.length} valid, ❌ ${invalidRows.length} invalid`);
    return { validRows, invalidRows, validIndexes };
  },

  // Enhanced transformRowData function with dynamic nested field handling
  transformRowData: async (
    row: any[],
    headers: string[],
    variationFields: Set<string>,
    categoryId: string,
    categoryName: string
  ): Promise<Record<string, any>> => {
    // console.log(`🔄 Starting transformation for row data: ${JSON.stringify(row)}`);
    // console.log(`📋 Headers: ${headers.join(", ")}`);
    // console.log(`🔧 Variation fields: ${Array.from(variationFields).join(", ") || "none"}`);

    const rowObj: Record<string, any> = {};

    // Process each header-value pair
    headers.forEach((header: string, idx: number) => {
      const cleanHeader = header.trim();
      const rawValue = row[idx] ?? "";
      const trimmedValue = rawValue.toString().trim();

      // console.log(`🔍 Processing "${cleanHeader}" = "${trimmedValue}"`);

      // Skip empty values
      if (!trimmedValue) {
        // console.log(`⚠️ Skipping empty value for "${cleanHeader}"`);
        return;
      }

      // Handle variation fields (comma-separated values)
      if (variationFields.has(cleanHeader)) {
        rowObj[cleanHeader] = trimmedValue
          .split(",")
          .map((v: any) => v.trim())
          .filter(Boolean);
        console.log(`✅ Variation field "${cleanHeader}": ${JSON.stringify(rowObj[cleanHeader])}`);
        return;
      }

      // Handle template fields (ending with *)
      if (cleanHeader.endsWith("*")) {
        rowObj[cleanHeader] = trimmedValue;
        // console.log(`📋 Template field "${cleanHeader}": "${trimmedValue}"`);
        return;
      }

      // Handle nested fields (containing dots)
      if (cleanHeader.includes(".")) {
        const parts = cleanHeader.split(".");
        const rootField = parts[0];

        // Initialize root field as array with empty object if not exists
        if (!rowObj[rootField]) {
          rowObj[rootField] = [{}];
        }

        // Navigate to the nested property and set the value
        let current = rowObj[rootField][0];
        for (let i = 1; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }

        // Set the final value as simple string
        const finalKey = parts[parts.length - 1];
        current[finalKey] = trimmedValue;

        // console.log(`🔗 Nested field "${cleanHeader}": "${trimmedValue}"`);
        return;
      }

      // Handle simple fields - wrap in array with object structure
      rowObj[cleanHeader] = [
        {
          value: trimmedValue,
          marketplace_id: "A1F83G8C2ARO7P",
        },
      ];

      // console.log(`📋 Simple field "${cleanHeader}": ${JSON.stringify(rowObj[cleanHeader])}`);
    });

    // Clean up empty objects in arrays
    Object.keys(rowObj).forEach((key) => {
      if (Array.isArray(rowObj[key])) {
        rowObj[key] = rowObj[key].filter((item) => {
          if (typeof item === "object" && item !== null) {
            // Check if object has any meaningful content
            const hasContent = Object.entries(item).some(([k, v]) => {
              if (k === "marketplace_id") return false; // Don't count default marketplace_id
              return v && v.toString().trim() !== "";
            });
            return hasContent;
          }
          return true;
        });

        // Remove field if array is empty after cleanup
        if (rowObj[key].length === 0) {
          delete rowObj[key];
          // console.log(`🧹 Removed empty field "${key}"`);
        }
      }
    });

    // Add category information
    rowObj.productCategoryName = categoryName.trim();
    rowObj.productCategory = categoryId.trim();

    console.log(`✅ Transformation complete. Final row object: ${JSON.stringify(rowObj, null, 2)}`);
    return rowObj;
  },
};

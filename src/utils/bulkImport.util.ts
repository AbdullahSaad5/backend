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

    console.log(`📚 Starting validation for workbook with ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}`);

    for (const sheetName of sheetNames) {
      console.log(`\n📄 Processing sheet: "${sheetName}"`);

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
      // console.log(`🔍 Extracted categoryName: "${categoryName}", categoryId: "${categoryId}"`);

      // Validate categoryId against database
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

      // Get Amazon schema for the category
      const amazonSchema = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(categoryId);
      const variationAspects = categoryVariationAspects[categoryId] || [];
      console.log(`🔧 Variation aspects for category "${categoryId}": ${variationAspects.join(", ") || "none"}`);

      // Create variation fields set from variation aspects
      const variationFields = new Set<string>(variationAspects);

      let sheetValidCount = 0;
      let sheetInvalidCount = 0;

      for (const [index, row] of rows.entries()) {
        const globalRowIndex = validRows.length + invalidRows.length + 1;
        console.log(`\n🔄 Processing row ${globalRowIndex} (sheet row ${index + 2})`);
        // console.log(`📥 Raw row data: ${JSON.stringify(row)}`);

        const errors: string[] = [];

        // Transform row data into the required format
        const rowObj = await bulkImportUtility.transformRowData(
          row,
          headerRow,
          variationFields,
          categoryId,
          categoryName
        );
        // console.log(`📤 Transformed row data: ${JSON.stringify(rowObj, null, 2)}`);

        // Validate transformed data against schema
        const validationResult: any = await validate(amazonSchema, rowObj, variationAspects);
        if (!validationResult.valid) {
          errors.push(...validationResult.errors);
          // console.log(`❌ Validation errors for row ${globalRowIndex}: ${errors.join(", ")}`);
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

    console.log(`\n🧪 Final Validation Summary: ✅ ${validRows.length} valid, ❌ ${invalidRows.length} invalid`);
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
    console.log(`🔄 Starting transformation for row data: ${JSON.stringify(row)}`);
    console.log(`📋 Headers: ${headers.join(", ")}`);
    console.log(`🔧 Variation fields: ${Array.from(variationFields).join(", ") || "none"}`);

    const rowObj: Record<string, any> = {};

    // ALL HELPER FUNCTIONS DEFINED FIRST - BEFORE ANY USAGE

    // Helper function to determine if a root field should be an array
    const isComplexArrayField = (fieldName: string): boolean => {
      const arrayFields = [
        "display",
        "brand",
        "bullet_point",
        "processor_description",
        "country_of_origin",
        "recommended_browse_nodes",
        "memory_storage_capacity",
        "computer_memory",
        "hard_disk",
        "weight",
        "epr_product_packaging",
      ];
      return arrayFields.includes(fieldName);
    };

    // Helper function to determine if a simple field should be an array
    const shouldBeArray = (fieldName: string): boolean => {
      const simpleArrayFields = [
        "bullet_point",
        "processor_description",
        "country_of_origin",
        "recommended_browse_nodes",
      ];
      return simpleArrayFields.includes(fieldName);
    };

    // Helper function to determine if field needs language tag
    const needsLanguageTag = (fieldType: string): boolean => {
      const textFields = [
        "bullet_point",
        "processor_description",
        "technology",
        "type",
        "name",
        "description",
        "title",
        "feature",
      ];
      return textFields.some((field) => fieldType.toLowerCase().includes(field));
    };

    // Helper function to determine if field needs unit
    const needsUnit = (fieldType: string): boolean => {
      const measurementFields = ["size", "capacity", "weight", "resolution"];
      return measurementFields.some((field) => fieldType.toLowerCase().includes(field));
    };

    // Helper function to get default unit based on field type
    const getDefaultUnit = (fieldType: string): string => {
      const fieldLower = fieldType.toLowerCase();
      if (fieldLower.includes("size") && fieldLower.includes("display")) return "inches";
      if (fieldLower.includes("resolution")) return "dots_per_inch";
      if (fieldLower.includes("weight")) return "grams";
      if (fieldLower.includes("capacity")) return "gigabytes";
      if (fieldLower.includes("percentage")) return "percent";
      return "units"; // default
    };

    // Helper function to create value objects with proper structure
    const createValueObject = (value: string, fieldType: string) => {
      const baseObj: any = { value: value };

      // Add marketplace_id for most fields
      baseObj.marketplace_id = "A1F83G8C2ARO7P"; // Default marketplace ID

      // Add language_tag for text fields
      if (needsLanguageTag(fieldType)) {
        baseObj.language_tag = "en_GB";
      }

      // Add unit for measurement fields
      if (needsUnit(fieldType)) {
        baseObj.unit = getDefaultUnit(fieldType);
      }

      return baseObj;
    };

    // Helper function to set nested value in object
    const setNestedValue = (obj: any, path: string[], value: any, isArrayField: boolean = false) => {
      let current = obj;

      // Navigate to the parent of the final key
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];

        // If this should be an array field, initialize as array
        if (i === 0 && isArrayField) {
          if (!current[key]) {
            current[key] = [];
          }
          // Ensure we have at least one object in the array
          if (current[key].length === 0) {
            current[key].push({});
          }
          current = current[key][0]; // Work with first object in array
        } else {
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }
      }

      // Set the final value
      const finalKey = path[path.length - 1];

      // Handle special cases for value structures
      if (finalKey === "value" || finalKey === "language_tag" || finalKey === "unit" || finalKey === "marketplace_id") {
        // For leaf values, create proper structure
        if (value && value.toString().trim()) {
          current[finalKey] = value.toString().trim();
        }
      } else if (Array.isArray(current[finalKey])) {
        // If it's already an array, add to it
        if (value && value.toString().trim()) {
          current[finalKey].push(createValueObject(value.toString().trim(), finalKey));
        }
      } else {
        // Create array structure for complex fields
        if (value && value.toString().trim()) {
          current[finalKey] = [createValueObject(value.toString().trim(), finalKey)];
        }
      }
    };

    // Clean up empty nested objects (for HYBRID strategy)
    const cleanupEmptyObjects = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(cleanupEmptyObjects).filter((item) => {
          if (typeof item === "object" && item !== null) {
            const keys = Object.keys(item);
            return (
              keys.length > 0 &&
              keys.some((key) => {
                if (key === "marketplace_id") return false; // Don't count default marketplace_id
                const value = item[key];
                if (typeof value === "string") return value.trim() !== "";
                if (Array.isArray(value)) return value.length > 0;
                return value != null;
              })
            );
          }
          return item != null && item !== "";
        });
      } else if (typeof obj === "object" && obj !== null) {
        const cleaned: any = {};
        let hasContent = false;

        for (const [key, value] of Object.entries(obj)) {
          const cleanedValue = cleanupEmptyObjects(value);
          if (
            cleanedValue != null &&
            cleanedValue !== "" &&
            !(Array.isArray(cleanedValue) && cleanedValue.length === 0)
          ) {
            cleaned[key] = cleanedValue;
            if (key !== "marketplace_id") hasContent = true;
          }
        }

        return hasContent ? cleaned : null;
      }
      return obj;
    };

    // END OF HELPER FUNCTIONS - NOW START MAIN PROCESSING

    // Group headers by their root field
    const fieldGroups: Record<string, string[]> = {};

    headers.forEach((header: string, idx: number) => {
      const cleanHeader = header.trim();
      const rawValue = row[idx] ?? "";

      // console.log(`🔍 Processing header "${cleanHeader}" with value: "${rawValue}"`);

      // Check if value is empty (configurable behavior)
      const isEmpty = !rawValue || rawValue.toString().trim() === "";

      if (isEmpty) {
        // console.log(`⚠️ Found empty value for header "${cleanHeader}"`);

        // For variation fields, always create empty array
        if (variationFields.has(cleanHeader)) {
          rowObj[cleanHeader] = [];
          console.log(`📋 Set empty variation field "${cleanHeader}" to empty array`);
          return;
        }

        // For other fields, you can choose strategy:
        // STRATEGY_SKIP: Skip empty fields entirely (recommended for validation)
        // STRATEGY_INCLUDE: Include with empty string value
        // STRATEGY_HYBRID: Skip simple fields, but allow partial nested objects

        const EMPTY_VALUE_STRATEGY: any = "STRATEGY_HYBRID"; // Change this as needed

        if (EMPTY_VALUE_STRATEGY === "STRATEGY_SKIP") {
          return; // Skip this field entirely
        } else if (EMPTY_VALUE_STRATEGY === "STRATEGY_INCLUDE") {
          // Continue processing with empty value
        } else if (EMPTY_VALUE_STRATEGY === "STRATEGY_HYBRID") {
          // For nested fields, we'll handle them later to see if any sibling has value
          // For simple fields, skip them
          if (!cleanHeader.includes(".")) {
            return; // Skip simple empty fields
          }
          // Continue for nested fields - we'll clean up empty parent objects later
        }
      }

      // Handle variation fields (split into arrays)
      if (variationFields.has(cleanHeader)) {
        if (typeof rawValue === "string" && rawValue.trim()) {
          rowObj[cleanHeader] = rawValue
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          console.log(`✅ Variation field "${cleanHeader}" transformed to: ${JSON.stringify(rowObj[cleanHeader])}`);
        } else {
          rowObj[cleanHeader] = [];
          console.log(`⚠️ Variation field "${cleanHeader}" is empty, set to empty array`);
        }
        return;
      }

      // Handle nested fields (e.g., brand.name, display.size.value, display.resolution_maximum.value)
      if (cleanHeader.includes(".")) {
        const parts = cleanHeader.split(".");
        const rootField = parts[0];

        if (!fieldGroups[rootField]) {
          fieldGroups[rootField] = [];
        }
        fieldGroups[rootField].push(cleanHeader);

        // Determine if this is an array field (common patterns)
        const isArrayField = isComplexArrayField(rootField);

        setNestedValue(rowObj, parts, rawValue, isArrayField);
        // console.log(`🔗 Set nested field "${cleanHeader}" with value: "${rawValue}"`);
        return;
      }

      // Handle simple array fields that should be arrays
      if (shouldBeArray(cleanHeader)) {
        const valueObj = createValueObject(rawValue.toString().trim(), cleanHeader);
        rowObj[cleanHeader] = [valueObj];
        console.log(`📋 Added array field "${cleanHeader}": ${JSON.stringify(rowObj[cleanHeader])}`);
      } else {
        // Handle regular fields
        rowObj[cleanHeader] = rawValue?.toString().trim() ?? "";
        console.log(`📋 Added regular field "${cleanHeader}" with value: "${rowObj[cleanHeader]}"`);
      }
    });

    // Post-process to ensure proper array structures
    Object.keys(rowObj).forEach((key) => {
      if (isComplexArrayField(key) && !Array.isArray(rowObj[key])) {
        // Convert object to array format
        const obj = rowObj[key];
        rowObj[key] = [obj];
        console.log(`🔄 Converted "${key}" to array format`);
      }
    });

    // Apply cleanup for hybrid strategy
    const EMPTY_VALUE_STRATEGY = "STRATEGY_HYBRID";
    if (EMPTY_VALUE_STRATEGY === "STRATEGY_HYBRID") {
      Object.keys(rowObj).forEach((key) => {
        if (key !== "productCategoryName" && key !== "productCategory") {
          const cleaned = cleanupEmptyObjects(rowObj[key]);
          if (cleaned == null || (Array.isArray(cleaned) && cleaned.length === 0)) {
            delete rowObj[key];
            console.log(`🧹 Removed empty field "${key}" after cleanup`);
          } else {
            rowObj[key] = cleaned;
          }
        }
      });
    }

    // Add category information
    rowObj.productCategoryName = categoryName.trim();
    rowObj.productCategory = categoryId.trim();
    console.log(
      `🏷️ Added category info - productCategoryName: "${rowObj.productCategoryName}", productCategory: "${rowObj.productCategory}"`
    );

    console.log(`✅ Transformation complete. Final row object: ${JSON.stringify(rowObj, null, 2)}`);
    return rowObj;
  },
};

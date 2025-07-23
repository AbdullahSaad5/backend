import fs from "fs";
import * as XLSX from "xlsx";
import path from "path";
import AdmZip from "adm-zip";
import { uploadFileToFirebase } from "./firebase";
import { ProductCategory } from "@/models";

import dotenv from "dotenv";
import { ebayListingService, inventoryService } from "@/services";
import { addLog } from "./bulkImportLogs.util";
dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
export const bulkImportUtility = {
  validateXLSXData: async (workbook: XLSX.WorkBook) => {
    const sheetNames = workbook.SheetNames;
    const validRows: { row: number; data: any }[] = [];
    const invalidRows: { row: number; errors: string[] }[] = [];
    const validIndexes = new Set<number>();

    for (const sheetName of sheetNames) {
      let match = sheetName.trim().match(/^(.+?)\s*\((\d+)\)\s*$/);

      // Optional auto-correct fallback
      if (!match && sheetName.includes("(")) {
        const parts = sheetName.split("(");
        if (parts.length === 2 && /^\d+\)?$/.test(parts[1].trim())) {
          const correctedName = `${parts[0].trim()} (${parts[1].replace(/\)/g, "").trim()})`;
          console.log(`⚠️ Auto-corrected sheet name: "${sheetName}" → "${correctedName}"`);
          match = correctedName.match(/^(.+?)\s*\((\d+)\)\s*$/);
        }
      }

      if (!match) {
        console.log(`❌ Invalid sheet name format: "${sheetName}". Use "name (number)"`);
        continue;
      }

      const [_, categoryName, categoryId] = match;
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

        rowObj.productCategoryName = categoryName.trim();
        rowObj.productCategory = categoryId;

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

    addLog(`🧪 Final Validation: ✅ ${validRows.length} invalid, ❌ ${invalidRows.length} invalid`);
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
        const { validRows, invalidRows } = await bulkImportUtility.validateXLSXData(partialWorkbook);

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
};

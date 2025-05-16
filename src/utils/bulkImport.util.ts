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

      // Find the .xlsx file and the media folder
      const xlsxFile = files.find((f) => f.endsWith(".xlsx"));
      const mediaFolder = files.find((f) => fs.lstatSync(path.join(mainFolder, f)).isDirectory());

      if (!xlsxFile || !mediaFolder) {
        addLog("❌ Invalid ZIP structure. Missing XLSX or media folder.");
        throw new Error("Invalid ZIP structure. Missing XLSX or media folder.");
      }

      addLog(`✅ XLSX File: ${xlsxFile}`);
      addLog(`✅ Media Folder: ${mediaFolder}`);

      const xlsxPath = path.join(mainFolder, xlsxFile);

      // 🧠 Read Excel workbook with all sheets
      const workbook = XLSX.readFile(xlsxPath);
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        addLog("❌ XLSX file has no sheets.");
        throw new Error("XLSX file has no sheets.");
      }

      addLog(`📄 Found worksheets: ${sheetNames.join(", ")}`);
      // Step 1: Identify non-empty sheets and validate rows
      const validRowsPerSheet: Record<string, any[]> = {};
      const invalidRowsPerSheet: Record<string, any[]> = {};

      sheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "", header: 1 });

        if (data.length < 2) {
          // Less than header + 1 row = skip
          return;
        }

        const [headerRowRaw, ...rows] = data;
        const headerRow = headerRowRaw as (string | undefined)[];
        const requiredIndexes: number[] = [];

        // Identify required headers (with *)
        const cleanedHeaders = headerRow.map((h: string | undefined, idx: number) => {
          if (typeof h === "string" && h.trim().endsWith("*")) {
            requiredIndexes.push(idx);
          }
          return typeof h === "string" ? h.replace("*", "").trim() : h;
        });

        const validRows: any = [];
        const invalidRows: any = [];

        rows.forEach((row: any, rowIndex) => {
          const errors: any = [];

          requiredIndexes.forEach((reqIdx) => {
            const fieldValue = row[reqIdx];
            if (!fieldValue || String(fieldValue).trim() === "") {
              errors.push(`Missing required field "${cleanedHeaders[reqIdx]}"`);
            }
          });

          if (errors.length === 0) {
            const rowObj: Record<string, any> = {};
            cleanedHeaders.forEach((key: any, idx) => {
              rowObj[key] = row[idx];
            });
            validRows.push({ row: rowIndex + 2, data: rowObj }); // +2 = 1-based row + header
          } else {
            invalidRows.push({ row: rowIndex + 2, errors });
          }
        });

        if (validRows.length || invalidRows.length) {
          addLog(`📄 Sheet "${sheetName}": ✅ ${validRows.length} valid rows, ❌ ${invalidRows.length} invalid rows`);

          invalidRows.forEach((rowInfo: any) => {
            addLog(`    ❌ Row ${rowInfo.row} error(s): ${rowInfo.errors.join(", ")}`);
          });

          validRowsPerSheet[sheetName] = validRows;
          invalidRowsPerSheet[sheetName] = invalidRows;
        }
      });
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

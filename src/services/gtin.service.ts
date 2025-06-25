// services/gtin.service.ts
import { Gtin } from "@/models";
import * as XLSX from "xlsx";

export const gtinService = {
  // Parse CSV and save GTINs to database

  createGtinsFromXlsx: async (fileBuffer: Buffer): Promise<string[]> => {
    const gtins: string[] = [];

    try {
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });

      if (workbook.SheetNames.length === 0) {
        throw new Error("No sheets found in the XLSX file");
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" is empty or missing`);
      }

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log("Parsed data from XLSX:", data);

      // Process rows
      data.forEach((row: any) => {
        const gtin = row[0]?.toString().trim();
        // Validate GTIN (8, 12, 13, or 14 digits)
        if (gtin && /^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$|^[0-9]{14}$/.test(gtin)) {
          gtins.push(gtin);
        }
      });

      if (gtins.length === 0) {
        throw new Error("No valid GTINs found in the file");
      }

      return gtins;
    } catch (error: any) {
      console.error("Error processing XLSX file:", error);
      throw new Error(`Failed to process XLSX file: ${error.message}`);
    }
  },
  // Get all unused GTINs
  getAllGtins: async () => {
    return Gtin.find({ isUsed: false }).select("gtin");
  },

  // Mark a GTIN as used and associate it with a listing
  useGtin: async (gtin: string, listingId: string) => {
    const gtinDoc: any = await Gtin.findOne({ gtin, isUsed: false });
    if (!gtinDoc) {
      throw new Error("GTIN not found or already used");
    }
    gtinDoc.isUsed = true;
    gtinDoc.usedInListing = listingId;
    await gtinDoc.save();
    return gtinDoc;
  },
};

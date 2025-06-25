// services/gtin.service.ts
import { Gtin } from "@/models";
import { parse } from "csv-parse";
import { Readable } from "stream";

export const gtinService = {
  // Parse CSV and save GTINs to database
  createGtinsFromCsv: async (csvBuffer: Buffer): Promise<string[]> => {
    const gtins: string[] = [];

    return new Promise((resolve, reject) => {
      const stream = Readable.from(csvBuffer);
      stream
        .pipe(parse({ delimiter: ",", columns: true }))
        .on("data", async (row) => {
          if (row.gtin) {
            gtins.push(row.gtin.trim());
          }
        })
        .on("end", async () => {
          try {
            // Save unique GTINs to database
            const savedGtins: string[] = [];
            for (const gtin of gtins) {
              const existingGtin = await Gtin.findOne({ gtin });
              if (!existingGtin) {
                await Gtin.create({ gtin });
                savedGtins.push(gtin);
              }
            }
            resolve(savedGtins);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error) => reject(error));
    });
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

// controllers/gtin.controller.ts
import { gtinService } from "@/services/gtin.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import fs from "fs";
import { Gtin } from "@/models";
export const gtinController = {
  // Handle CSV upload (single handler function)
  uploadCsv: async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "No file uploaded",
        });
      }

      const fileBuffer = fs.readFileSync(req.file.path);
      const gtins = await gtinService.createGtinsFromXlsx(fileBuffer);

      // Normalize GTINs (trim whitespace, ensure consistent format)
      const normalizedGtins = gtins.map((gtin) => gtin.trim());

      // Check existing GTINs with normalized comparison
      const existingDocs = await Gtin.find({
        gtin: { $in: normalizedGtins },
      }).select("gtin");
      const existingGtins = existingDocs.map((doc) => doc.gtin);

      console.log(
        `Found ${existingGtins.length} existing GTINs:`,
        existingGtins.slice(0, 10),
        existingGtins.length > 10 ? `...and ${existingGtins.length - 10} more` : ""
      );

      // Filter new GTINs
      const newGtins = normalizedGtins.filter((gtin) => !existingGtins.includes(gtin));
      console.log(
        `Found ${newGtins.length} new GTINs to insert:`,
        newGtins.slice(0, 10),
        newGtins.length > 10 ? `...and ${newGtins.length - 10} more` : ""
      );

      let insertedCount = 0;
      let skippedCount = 0;

      // Insert new GTINs in smaller batches to handle potential duplicates better
      if (newGtins.length > 0) {
        const batchSize = 100; // Process in smaller batches

        for (let i = 0; i < newGtins.length; i += batchSize) {
          const batch = newGtins.slice(i, i + batchSize);
          const gtinDocs = batch.map((gtin) => ({
            gtin,
            isUsed: false,
            usedInListing: null,
            createdAt: Date.now(),
          }));

          try {
            const result = await Gtin.insertMany(gtinDocs, {
              ordered: false, // Continue processing even if some docs fail
              lean: true, // Faster insertion
            });
            insertedCount += result.length;
            console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${result.length} GTINs`);
          } catch (error: any) {
            if (error.name === "MongoBulkWriteError") {
              // Handle partial success in bulk write
              const actualInserted = error.result?.nInserted || 0;
              const actualSkipped = batch.length - actualInserted;

              insertedCount += actualInserted;
              skippedCount += actualSkipped;

              console.log(
                `Batch ${Math.floor(i / batchSize) + 1}: Inserted ${actualInserted}, skipped ${actualSkipped} due to duplicates`
              );

              // Log specific duplicate errors for debugging
              if (error.writeErrors && error.writeErrors.length > 0) {
                console.log(
                  "Duplicate GTINs in this batch:",
                  error.writeErrors
                    .slice(0, 5)
                    .map((err: any) => err.op?.gtin)
                    .filter(Boolean)
                );
              }
            } else {
              console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
              throw error; // Re-throw if it's not a duplicate error
            }
          }
        }
      } else {
        console.log("No new GTINs to insert");
      }

      // Update existing GTINs (optional, comment out if not needed)
      let updatedCount = 0;
      if (existingGtins.length > 0) {
        const updateResult = await Gtin.updateMany(
          { gtin: { $in: existingGtins } },
          {
            $set: {
              isUsed: false,
              usedInListing: null,
              updatedAt: Date.now(), // Use updatedAt instead of createdAt for updates
            },
          }
        );
        updatedCount = updateResult.modifiedCount;
        console.log(`Updated ${updatedCount} existing GTINs`);
      }

      // Fetch all processed GTINs for response
      const savedGtins = await Gtin.find({
        gtin: { $in: normalizedGtins },
      }).select("gtin");

      console.log(`Found ${savedGtins.length} GTINs in database after processing`);

      // Delete the uploaded file
      fs.unlinkSync(req.file.path);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "GTINs processed successfully",
        data: {
          total: normalizedGtins.length,
          inserted: insertedCount,
          updated: updatedCount,
          skipped: skippedCount,
          existing: existingGtins.length,
          finalCount: savedGtins.length,
          gtins: savedGtins.map((doc) => doc.gtin),
        },
      });
    } catch (error: any) {
      console.error("Error uploading GTINs:", error);

      // Clean up file if it exists
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Error uploading GTINs",
        error: error.message,
      });
    }
  },

  // Get all unused GTINs
  getAllGtins: async (req: Request, res: Response) => {
    try {
      const gtins = await gtinService.getAllGtins();
      res.status(StatusCodes.OK).json({
        message: "GTINs retrieved successfully",
        gtins,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error retrieving GTINs" });
    }
  },

  // Assign a GTIN to a listing
  assignGtinToListing: async (req: Request, res: Response) => {
    try {
      const { gtin, listingId } = req.body;

      if (!gtin || !listingId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Both gtin and listingId are required",
        });
      }

      const updatedGtin = await gtinService.useGtin(gtin, listingId);

      res.status(StatusCodes.OK).json({
        message: "GTIN assigned to listing successfully",
        gtin: updatedGtin,
      });
    } catch (error: any) {
      console.error("Error assigning GTIN:", error);
      res.status(StatusCodes.BAD_REQUEST).json({
        message: error.message,
      });
    }
  },
};

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

      // Prepare GTIN documents for bulk insertion
      const gtinDocs = gtins.map((gtin) => ({
        gtin,
        isUsed: false,
        usedInListing: null,
        createdAt: new Date(),
      }));

      let insertedCount = 0;
      let skippedCount = 0;

      try {
        // Bulk insert with ordered: false
        const result = await Gtin.insertMany(gtinDocs, { ordered: false });
        insertedCount = result.length;
      } catch (error: any) {
        // Handle duplicate key errors (E11000)
        if (error.name === "MongoBulkWriteError" && error.code === 11000) {
          insertedCount = error.result?.nInserted || 0;
          skippedCount = gtins.length - insertedCount;
          console.log(`Inserted ${insertedCount} GTINs, skipped ${skippedCount} due to duplicates`);
        } else {
          throw error; // Rethrow other errors
        }
      }

      // Fetch saved GTINs to confirm
      const savedGtins = await Gtin.find({ gtin: { $in: gtins } }).select("gtin");
      console.log(`Found ${savedGtins.length} GTINs in database`);

      // Delete the uploaded file
      fs.unlinkSync(req.file.path);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "GTINs uploaded and saved successfully",
        data: {
          total: gtins.length,
          inserted: insertedCount,
          skipped: skippedCount,
          gtins: savedGtins.map((doc) => doc.gtin),
        },
      });
    } catch (error: any) {
      console.error("Error uploading GTINs:", error);
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
      const updatedGtin = await gtinService.useGtin(gtin, listingId);
      res.status(StatusCodes.OK).json({
        message: "GTIN assigned to listing successfully",
        gtin: updatedGtin,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
    }
  },
};

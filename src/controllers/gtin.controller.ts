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

      console.log(`Processing ${gtins.length} GTINs from file`);

      // Create GTIN documents
      const gtinDocs = gtins.map((gtin) => ({
        gtin: gtin.trim(),
        isUsed: false,
        usedInListing: null,
        createdAt: Date.now(),
      }));

      // Insert all GTINs without any duplicate checking
      const result = await Gtin.insertMany(gtinDocs);
      const insertedCount = result.length;

      console.log(`Successfully inserted ${insertedCount} GTINs into database`);

      // Delete the uploaded file
      fs.unlinkSync(req.file.path);

      res.status(StatusCodes.CREATED).json({
        status: StatusCodes.CREATED,
        message: "GTINs inserted successfully",
        data: {
          total: gtins.length,
          inserted: insertedCount,
          gtins: result.map((doc) => doc.gtin),
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

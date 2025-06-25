// controllers/gtin.controller.ts
import { gtinService } from "@/services/gtin.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const gtinController = {
  // Handle CSV upload (single handler function)
  uploadCsv: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "No file uploaded" });
      }

      // Assuming you use a function to process the CSV
      const gtins = await gtinService.createGtinsFromCsv(req.file.buffer);

      // Send success response
      res.status(StatusCodes.CREATED).json({
        message: "GTINs uploaded successfully",
        gtins,
      });
    } catch (error) {
      console.error("Error uploading GTINs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error uploading GTINs", error });
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

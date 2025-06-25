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
      const gtins = await gtinService.createGtinsFromCsv(req.file.buffer);
      res.status(StatusCodes.CREATED).json({
        message: "GTINs uploaded successfully",
        gtins,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error uploading GTINs" });
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

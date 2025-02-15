import { Request, Response } from "express";
import mongoose from "mongoose";
import { warrantyService } from "@/services/warranty.service";

export const warrantyController = {
  createWarranty: async (req: Request, res: Response) => {
    try {
      const warranty = await warrantyService.createWarranty(req.body);
      res.status(201).json(warranty);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get All Warranties
  getAllWarranties: async (req: Request, res: Response) => {
    try {
      const warranties = await warrantyService.getAllWarranties();
      res.status(200).json(warranties);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get Warranty by ID
  getWarrantyById: async (req: Request, res: Response) => {
    try {
      const warranty = await warrantyService.getWarrantyById(req.params.id);
      if (!warranty)
        return res.status(404).json({ message: "Warranty not found" });
      res.status(200).json(warranty);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update Warranty
  updateWarranty: async (req: Request, res: Response) => {
    try {
      const warranty = await warrantyService.updateWarranty(
        req.params.id,
        req.body
      );
      if (!warranty)
        return res.status(404).json({ message: "Warranty not found" });
      res.status(200).json(warranty);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete Warranty
  deleteWarranty: async (req: Request, res: Response) => {
    try {
      const warranty = await warrantyService.deleteWarranty(req.params.id);
      if (!warranty)
        return res.status(404).json({ message: "Warranty not found" });
      res.status(200).json({ message: "Warranty deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

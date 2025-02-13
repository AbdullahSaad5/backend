import { Taxes } from "@/models";
import { Request, Response } from "express";

export const taxesController = {
  createOrUpdateTax: async (req: Request, res: Response) => {
    try {
      const { vatPercentage } = req.body;

      // Check if a tax rule already exists
      let tax = await Taxes.findOne();

      if (tax) {
        // If exists, update it
        tax.vatPercentage = vatPercentage;
        await tax.save();

        return res.status(200).json({
          message: "Tax rule updated successfully",
          tax,
        });
      }

      // Create a new tax rule if none exists
      tax = new Taxes({ vatPercentage });
      await tax.save();

      return res.status(201).json({
        message: "Tax rule created successfully",
        tax,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error processing tax rule",
        error,
      });
    }
  },

  getTax: async (_req: Request, res: Response) => {
    try {
      const tax = await Taxes.findOne();

      if (!tax) {
        return res.status(404).json({ message: "No tax rule found" });
      }

      res.status(200).json(tax);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  updateTax: async (req: Request, res: Response) => {
    try {
      const { vatPercentage } = req.body;

      const updatedTax = await Taxes.findOneAndUpdate(
        {},
        { vatPercentage },
        { new: true }
      );

      if (!updatedTax) {
        return res.status(404).json({ message: "Tax rule not found" });
      }

      res.status(200).json({
        message: "Tax rule updated successfully",
        tax: updatedTax,
      });
    } catch (error) {
      res.status(500).json({ message: "Error while updating tax", error });
    }
  },
};

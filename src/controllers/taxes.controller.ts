import { Taxes } from "@/models";
import { Request, Response } from "express";

export const taxesController = {
  createOrUpdateTax: async (req: Request, res: Response) => {
    try {
      const { vatPercentage, profitPercentage } = req.body;

      // Find existing tax rule
      let tax = await Taxes.findOne();

      if (tax) {
        // Update only provided fields
        if (vatPercentage !== undefined) tax.vatPercentage = vatPercentage;
        if (profitPercentage !== undefined) tax.profitPercentage = profitPercentage;

        await tax.save();

        return res.status(200).json({
          message: "Tax rule updated successfully",
          tax,
        });
      }

      // Create new tax rule (requires at least one of the fields)
      tax = new Taxes({ vatPercentage, profitPercentage });
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
      const updateData: any = {};

      if (req.body.vatPercentage !== undefined) {
        updateData.vatPercentage = req.body.vatPercentage;
      }
      if (req.body.profitPercentage !== undefined) {
        updateData.profitPercentage = req.body.profitPercentage;
      }

      const updatedTax = await Taxes.findOneAndUpdate({}, updateData, {
        new: true,
      });

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

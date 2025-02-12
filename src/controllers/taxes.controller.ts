import { Taxes } from "@/models";
// import { taxesService } from "@/services/taxes.service";
import { Request, Response } from "express";

export const taxesController = {
  createTax: async (req: Request, res: Response) => {
    try {
      const { country, state, vatPercentage } = req.body;

      const existingTax = await Taxes.findOne({ country, state });
      if (existingTax)
        return res
          .status(400)
          .json({ message: "Tax rule already exists for thi" });

      const newTax = new Taxes({ country, state, vatPercentage });
      await newTax.save();

      res
        .status(201)
        .json({ message: "Tax rule created successfully", tax: newTax });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get all tax rules
  getAllTaxes: async (_req: Request, res: Response) => {
    try {
      const taxes = await Taxes.find();
      res.status(200).json(taxes);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Update a tax rule
  updateTax: async (req: Request, res: Response) => {
    try {
      const { country, state, vatPercentage } = req.body;

      const updatedTax = await Taxes.findOneAndUpdate(
        { country, state },
        { vatPercentage },
        { new: true }
      );

      if (!updatedTax)
        return res.status(404).json({ message: "Tax rule not found" });

      res
        .status(200)
        .json({ message: "Tax rule updated successfully", tax: updatedTax });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Delete a tax rule
  deleteTax: async (req: Request, res: Response) => {
    try {
      const { country, state } = req.params;

      const deletedTax = await Taxes.findOneAndDelete({
        country,
        state,
      });
      if (!deletedTax)
        return res.status(404).json({ message: "Tax rule not found" });

      res.status(200).json({ message: "Tax rule deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};

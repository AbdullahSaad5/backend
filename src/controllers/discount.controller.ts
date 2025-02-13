import { Discount } from "@/models";
import { Request, Response } from "express";
import mongoose from "mongoose";

export const discountController = {
  // Create or update a discount for a specific category
  createOrUpdateDiscount: async (req: Request, res: Response) => {
    try {
      const { categoryId, fixedDiscountValue, percentageDiscountValue } =
        req.body;

      if (!categoryId) {
        return res.status(400).json({ message: "Category ID is required" });
      }

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // Check if a discount for this category already exists
      let discount = await Discount.findOne({ applicableCategory: categoryId });

      if (discount) {
        // Update existing discount
        discount.fixedDiscountValue = fixedDiscountValue;
        discount.percentageDiscountValue = percentageDiscountValue;
        await discount.save();

        return res.status(200).json({
          message: "Discount updated successfully",
          discount,
        });
      }

      // Create new discount
      discount = new Discount({
        applicableCategory: categoryId,
        fixedDiscountValue,
        percentageDiscountValue,
      });

      await discount.save();

      return res.status(201).json({
        message: "Discount created successfully",
        discount,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({
          message:
            "A discount for this category already exists. Try updating it instead.",
          error,
        });
      }
      return res.status(500).json({
        message: "Error processing discount",
        error,
      });
    }
  },

  // Get all discounts (should return max 7 discounts)
  getAllDiscounts: async (_req: Request, res: Response) => {
    try {
      const discounts = await Discount.find().populate("applicableCategory");

      res.status(200).json(discounts);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get discount for a specific category
  getDiscountByCategory: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const discount = await Discount.findOne({
        applicableCategory: categoryId,
      });

      if (!discount) {
        return res
          .status(404)
          .json({ message: "No discount found for this category" });
      }

      res.status(200).json(discount);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};

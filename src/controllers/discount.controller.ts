import { Discount } from "@/models";
// import { discountService } from "@/services/discount.service"; // Importing the discount service
import { Request, Response } from "express";
import mongoose from "mongoose";
export const discountController = {
  // Create a new discount
  createDiscount: async (req: Request, res: Response) => {
    try {
      const {
        discountName,
        discountType,
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        applicableProducts,
        applicableCategories,
      } = req.body;

      // Convert string IDs to ObjectIds
      const convertedProducts = applicableProducts?.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
      const convertedCategories = applicableCategories?.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );

      const newDiscount = new Discount({
        discountName,
        discountType,
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        applicableProducts: convertedProducts,
        applicableCategories: convertedCategories,
      });

      await newDiscount.save();
      res
        .status(201)
        .json({
          message: "Discount created successfully",
          discount: newDiscount,
        });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get all discounts
  getAllDiscounts: async (_req: Request, res: Response) => {
    try {
      const discounts = await Discount.find()
        .populate("applicableProducts", "name price") // Fetch product details
        .populate("applicableCategories", "name"); // Fetch category details

      res.status(200).json(discounts);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get discount by ID
  getDiscountById: async (req: Request, res: Response) => {
    try {
      const discount = await Discount.findById(req.params.id)
        .populate("applicableProducts", "name price")
        .populate("applicableCategories", "name");

      if (!discount)
        return res.status(404).json({ message: "Discount not found" });

      res.status(200).json(discount);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Update a discount
  updateDiscount: async (req: Request, res: Response) => {
    try {
      const {
        discountName,
        discountType,
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        applicableProducts,
        applicableCategories,
      } = req.body;

      // Convert string IDs to ObjectIds
      const convertedProducts = applicableProducts?.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );
      const convertedCategories = applicableCategories?.map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );

      const updatedDiscount = await Discount.findByIdAndUpdate(
        req.params.id,
        {
          discountName,
          discountType,
          discountValue,
          maxDiscount,
          minPurchaseAmount,
          applicableProducts: convertedProducts,
          applicableCategories: convertedCategories,
        },
        { new: true, runValidators: true }
      );

      if (!updatedDiscount)
        return res.status(404).json({ message: "Discount not found" });

      res
        .status(200)
        .json({
          message: "Discount updated successfully",
          discount: updatedDiscount,
        });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Delete a discount
  deleteDiscount: async (req: Request, res: Response) => {
    try {
      const deletedDiscount = await Discount.findByIdAndDelete(req.params.id);
      if (!deletedDiscount)
        return res.status(404).json({ message: "Discount not found" });

      res.status(200).json({ message: "Discount deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Apply a discount to a product or order
  applyDiscount: async (req: Request, res: Response) => {
    try {
      const { discountId, productId, categoryId, orderAmount } = req.body;

      const discount = await Discount.findById(discountId);
      if (!discount)
        return res.status(404).json({ message: "Discount not found" });

      // Check if the discount applies to the product or category
      if (
        (discount.applicableProducts?.length ?? 0) > 0 &&
        !(discount.applicableProducts ?? []).includes(
          new mongoose.Types.ObjectId(productId)
        )
      ) {
        return res
          .status(400)
          .json({ message: "Discount is not valid for this product" });
      }

      if (
        (discount.applicableCategories?.length ?? 0) > 0 &&
        !(discount.applicableCategories ?? []).includes(
          new mongoose.Types.ObjectId(categoryId)
        )
      ) {
        return res
          .status(400)
          .json({ message: "Discount is not valid for this category" });
      }

      // Check minimum purchase amount
      if (
        discount.minPurchaseAmount &&
        orderAmount < discount.minPurchaseAmount
      ) {
        return res
          .status(400)
          .json({
            message: `Minimum purchase amount required is ${discount.minPurchaseAmount}`,
          });
      }

      // Calculate discount amount
      let discountAmount =
        discount.discountType === "percentage"
          ? (orderAmount * discount.discountValue) / 100
          : discount.discountValue;

      if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
        discountAmount = discount.maxDiscount;
      }

      res
        .status(200)
        .json({ message: "Discount applied successfully", discountAmount });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};

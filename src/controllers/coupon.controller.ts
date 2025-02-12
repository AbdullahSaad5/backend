import { Coupon } from "@/models";
import { couponService } from "@/services/coupon.service"; // Importing the coupon service
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes"; // For HTTP status codes
import mongoose from "mongoose";

export const couponController = {
  // Create a new coupon
  createCoupon: async (req: Request, res: Response) => {
    try {
      const {
        code,
        discountType, // Added missing field
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        expiryDate,
        usageLimit,
        applicableProducts,
        applicableCategories,
      } = req.body;

      // Ensure `discountType` is provided
      if (!discountType) {
        return res.status(400).json({ message: "discountType is required" });
      }

      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.status(400).json({ message: "Coupon code already exists" });
      }

      const newCoupon = new Coupon({
        code,
        discountType,
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        expiryDate,
        usageLimit,
        applicableProducts,
        applicableCategories,
      });

      await newCoupon.save();
      res
        .status(201)
        .json({ message: "Coupon created successfully", coupon: newCoupon });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get all coupons
  getAllCoupons: async (_req: Request, res: Response) => {
    try {
      const coupons = await Coupon.find();
      res.status(200).json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Get coupon by ID
  getCouponById: async (req: Request, res: Response) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });

      res.status(200).json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  //update coupon

  updateCoupon: async (req: Request, res: Response) => {
    try {
      const {
        code,
        discountType,
        discountValue,
        maxDiscount,
        minPurchaseAmount,
        expiryDate,
        isActive,
        usageLimit,
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

      // Check if the coupon exists before updating
      const existingCoupon = await Coupon.findById(req.params.id);
      if (!existingCoupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        req.params.id,
        {
          code,
          discountType,
          discountValue,
          maxDiscount,
          minPurchaseAmount,
          expiryDate,
          isActive,
          usageLimit,
          applicableProducts: convertedProducts,
          applicableCategories: convertedCategories,
        },
        { new: true, runValidators: true } // `runValidators: true` ensures validation is applied
      );

      res.status(200).json({
        message: "Coupon updated successfully",
        coupon: updatedCoupon,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Delete a coupon
  deleteCoupon: async (req: Request, res: Response) => {
    try {
      const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
      if (!deletedCoupon)
        return res.status(404).json({ message: "Coupon not found" });

      res.status(200).json({ message: "Coupon deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },

  // Validate a coupon
  validateCoupon: async (req: Request, res: Response) => {
    try {
      const { code } = req.body;

      const coupon = await Coupon.findOne({ code });
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });

      if (!coupon.isActive || coupon.expiryDate < new Date()) {
        return res
          .status(400)
          .json({ message: "Coupon is expired or inactive" });
      }

      if (coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }

      // Increment usage count
      coupon.usageCount += 1;
      await coupon.save();

      res.status(200).json({
        message: "Coupon applied successfully",
        discount: coupon.discountValue,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error });
    }
  },
};

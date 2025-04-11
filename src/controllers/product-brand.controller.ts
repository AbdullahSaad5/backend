import { productBrandService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const productBrandController = {
  addBrand: async (req: Request, res: Response) => {
    try {
      const { name, description, logo, isBlocked } = req.body;
      const newBrand = await productBrandService.createBrand(name, description, logo, isBlocked);
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Brand created successfully",
        data: newBrand,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating brand",
      });
    }
  },

  getAllBrands: async (_req: Request, res: Response) => {
    try {
      const brands = await productBrandService.getAllBrands();
      res.status(StatusCodes.OK).json({ success: true, data: brands });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching brands",
      });
    }
  },

  getSpecificBrand: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const brand = await productBrandService.getBrandById(id);
      if (!brand) return res.status(StatusCodes.NOT_FOUND).json({ message: "Brand not found" });
      res.status(StatusCodes.OK).json({ success: true, data: brand });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching brand",
      });
    }
  },

  editBrand: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, logo, isBlocked } = req.body;
      const brand = await productBrandService.updateBrand(id, { name, description, logo, isBlocked });
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Brand updated successfully",
        data: brand,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating brand",
      });
    }
  },

  deleteBrand: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await productBrandService.deleteBrand(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Brand deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting brand",
      });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const result = await productBrandService.toggleBlock(id, isBlocked);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Brand ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error toggling block status",
      });
    }
  },
};

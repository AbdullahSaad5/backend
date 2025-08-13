import { ebay } from "@/routes/ebay.route";
import { productCategoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const productCategoryController = {
  addCategory: async (req: Request, res: Response) => {
    try {
      const {
        name,
        ebayCategoryId,
        amazonCategoryId,
        description,
        image,
        tags,
        isBlocked,
        isPart,
        isFeatured,
      } = req.body;

      const newProductCategory = await productCategoryService.createCategory(
        name,
        ebayCategoryId,
        amazonCategoryId,
        description,
        image,
        tags,
        isBlocked,
        isPart,
        isFeatured
      );

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Product category created successfully",
        data: newProductCategory,
      });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating product category",
      });
    }
  },

  getAllCategoryWeb: async (req: Request, res: Response) => {
    const { isPart, isBlocked } = req.query;
    const filter = { isPart, isBlocked };
    try {
      const categories = await productCategoryService.getAllCategoryWeb(filter);
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting all product categories",
      });
    }
  },

  getAllCategory: async (req: Request, res: Response) => {
    try {
      const categories = await productCategoryService.getAllCategory();
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting all product categories",
      });
    }
  },
  getSpecificCategory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await productCategoryService.getById(id);
      //   console.log(result);
      if (!result) return res.status(404).json({ message: "Category not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error getting product category" });
    }
  },

  editCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        ebayCategoryId,
        amazonCategoryId,
        description,
        image,
        tags,
        isBlocked,
        isPart,
        isFeatured,
      } = req.body;

      const category = await productCategoryService.editCategory(id, {
        name,
        ebayCategoryId,
        amazonCategoryId,
        description,
        image,
        tags,
        isBlocked,
        isPart,
        isFeatured,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      console.error("Edit Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating supplier category",
      });
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await productCategoryService.deleteCategory(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Category deleted successfully",
        deletedUser: result,
      });
    } catch (error) {
      console.error("Delete Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting product category" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      console.log("id : ", id);
      const result = await productCategoryService.toggleBlock(id, isBlocked);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Category ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating product category status",
      });
    }
  },

  toggleFeatured: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isFeatured } = req.body;
      console.log("id : ", id);
      const result = await productCategoryService.toggleFeatured(id, isFeatured);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Category ${isFeatured ? "featured" : "unfeatured"} successfully`,
        data: result,
      });
    } catch (error: any) {
      console.error("Toggle Featured Category Error:", error);
      if (error.message === "Maximum of 4 categories can be featured at a time") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message,
        });
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating product category featured status",
      });
    }
  },
};

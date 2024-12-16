import { productCategoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const productCategoryController = {
  addCategory: async (req: Request, res: Response) => {
    try {
      const { name, description, image, tags , isBlocked } = req.body;
      //   console.log(name, description, image);
      const newProductCategory = await productCategoryService.createCategory(name, description, image, tags , isBlocked);
      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: "Product category created successfully", data: newProductCategory });
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error creating product category" });
    }
  },

  getAllCategory: async (req: Request, res: Response) => {
    try {
      const categories = await productCategoryService.getAllCategory();
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting all product categories" });
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
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting product category" });
    }
},

  editCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, image, tags , isBlocked } = req.body;
      const category = await productCategoryService.editCategory(id, { name, description, image, tags , isBlocked });
      res.status(StatusCodes.OK).json({ success: true, message: "Category updated successfully", data: category });
    } catch (error) {
      console.error("Edit Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating supplier category" });
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await productCategoryService.deleteCategory(id);
      res.status(StatusCodes.OK).json({ success: true, message: "Category deleted successfully", deletedUser: result });
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
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating product category status" });
    }
},


};
import { partCategoryService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const partCategoryController = {
  addCategory: async (req: Request, res: Response) => {
    try {
      const { name, description, image, tags , isBlocked } = req.body;
      //   console.log(name, description, image);
      const newPartCategory = await partCategoryService.createCategory(name, description, image, tags , isBlocked);
      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: "Part category created successfully", data: newPartCategory });
    } catch (error: any) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        console.error(error);
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        // console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating part category" });
      }
    }
  },

  getAllCategory: async (req: Request, res: Response) => {
    try {
      const categories = await partCategoryService.getAllCategory();
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting all part categories" });
    }
  },

  getSpecificCategory: async (req: Request, res: Response) => {
    try {
    const id = req.params.id;
    const result = await partCategoryService.getById(id);
    //   console.log(result);
    if (!result) return res.status(404).json({ message: "Category not found" });
    res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
    console.error("View Category Error:", error);
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting part category" });
    }
},

  editCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, image, tags , isBlocked } = req.body;
      const category = await partCategoryService.editCategory(id, { name, description, image, tags , isBlocked });
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
      const result = await partCategoryService.deleteCategory(id);
      res.status(StatusCodes.OK).json({ success: true, message: "Category deleted successfully", deletedUser: result });
    } catch (error) {
      console.error("Delete Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting part category" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    console.log("id : ", id);
    const result = await partCategoryService.toggleBlock(id, isBlocked);
    res.status(StatusCodes.OK).json({
        success: true,
        message: `Category ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
    });
    } catch (error) {
    console.error("Toggle Block Category Error:", error);
    res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating part category status" });
    }
},


};

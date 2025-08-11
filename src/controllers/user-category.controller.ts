import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { userCategoryService } from "@/services";

export const userCategoryController = {
  // controller for get all users categories
  allUsersCategories: async (req: Request, res: Response) => {
    try {
      const usersCategories = await userCategoryService.getAllUsersCategories();
      console.log(usersCategories);
      res.status(StatusCodes.OK).json(usersCategories);
    } catch (error) {
      console.log(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching user categories", error: error });
    }
  },

  // controller for post new user category
  createUserCategory: async (req: Request, res: Response) => {
    try {
      const { role, description, permissions, categoryType } = req.body;

      const newUserCategory = await userCategoryService.createCategory(role, description, permissions, categoryType);

      res.status(StatusCodes.CREATED).json({
        message: "User category created successfully",
        userCategory: newUserCategory,
      });
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
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating user category" });
      }
    }
  },

  editCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, description, permissions, categoryType } = req.body;
      const category = await userCategoryService.editCategory(id, { role, description, permissions, categoryType });
      res.status(StatusCodes.OK).json({ success: true, message: "Category updated successfully", data: category });
    } catch (error: any) {
      // console.error("Edit Category Error:", error);
      if (error.name === "MongoServerError" && error.code === 11000) {
        // console.log("insode if  error : ")
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        // console.log("field : " , field)
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error updating user category" });
      }
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await userCategoryService.deleteCategory(id);
      res.status(StatusCodes.OK).json({ success: true, message: "Category deleted successfully", deletedUser: result });
    } catch (error) {
      console.error("Delete Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting category" });
    }
  },

  getSpecificCategory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await userCategoryService.getById(id);
      //   console.log(result);
      if (!result) return res.status(404).json({ message: "Category not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting supplier category" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const result = await userCategoryService.toggleBlock(id, isBlocked);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Category ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating user category status" });
    }
  },
};

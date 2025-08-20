import { BlogCategoryService } from "@/services/blog-category.service";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const BlogCategoryController = {
  addCategory: async (req: Request, res: Response) => {
    try {
      const { name, description, image } = req.body;
      console.log(name, description, image);
      const newBlogCategory = await BlogCategoryService.createCategory(
        name,
        description,
        image
      );
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Blog category created successfully",
        data: newBlogCategory,
      });
    } catch (error: any) {
      console.error(error);
      if (error.name === "MongoServerError" && error.code === 11000) {
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        // console.error(error);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Error creating user category" });
      }
    }
  },

  editCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, image } = req.body;
      const category = await BlogCategoryService.editCategory(id, {
        name,
        description,
        image,
      });
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
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
          .json({ success: false, message: "Error updating Blog category" });
      }
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await BlogCategoryService.deleteCategory(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Category deleted successfully",
        deletedUser: result,
      });
    } catch (error) {
      console.error("Delete Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting Blog category" });
    }
  },

  getAllCategory: async (req: Request, res: Response) => {
    try {
      // const categories = await BlogCategoryService.getAllCategory();
      // console.log(categories);
      // res.status(StatusCodes.OK).json({ success: true, data: categories });

      // Extract pagination and filter parameters from query string
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = (req.query.sortBy as string) || "date";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
      const category = req.query.category as string;
      const search = req.query.search as string;

      // Validate pagination parameters
      if (page < 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Page number must be greater than 0",
        });
      }

      if (limit < 1 || limit > 100) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Limit must be between 1 and 100",
        });
      }

      const result = await BlogCategoryService.getAllCategory({
        page,
        limit,
        sortBy,
        sortOrder,
        category,
        search,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.blogCategories,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("View Categories Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting all Blog categories" });
    }
  },

  getSpecificCategory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await BlogCategoryService.getById(id);
      //   console.log(result);
      if (!result)
        return res.status(404).json({ message: "Category not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View Category Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting Blog category" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      console.log("id : ", id);
      const result = await BlogCategoryService.toggleBlock(id, isBlocked);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Category ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating Blog category status",
      });
    }
  },
};

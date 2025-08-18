import { blogService } from "@/services/blog.service";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const blogController = {
  addblog: async (req: Request, res: Response) => {
    try {
      const { title, content, category, altText, seoTitle, authorName, coverImage, focusKeyword } = req.body;
      console.log(title, content, category);
      const newblog = await blogService.createblog(
        title,
        content,
        category,
        altText,
        seoTitle,
        authorName,
        coverImage,
        focusKeyword
      );
      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Blog blog created successfully",
        data: newblog,
      });
    } catch (error: any) {
      console.error(error);
      if (error.title === "MongoServerError" && error.code === 11000) {
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        // console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating user blog" });
      }
    }
  },

  editblog: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, category } = req.body;
      const blog = await blogService.editblog(id, { title, content, category });
      res.status(StatusCodes.OK).json({
        success: true,
        message: "blog updated successfully",
        data: blog,
      });
    } catch (error: any) {
      // console.error("Edit blog Error:", error);
      if (error.title === "MongoServerError" && error.code === 11000) {
        // console.log("insode if  error : ")
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        // console.log("field : " , field)
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating Blog blog" });
      }
    }
  },

  deleteblog: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await blogService.deleteblog(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "blog deleted successfully",
        deletedUser: result,
      });
    } catch (error) {
      console.error("Delete blog Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting Blog blog" });
    }
  },

  getAllblog: async (req: Request, res: Response) => {
    try {
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

      const result = await blogService.getAllblog({
        page,
        limit,
        sortBy,
        sortOrder,
        category,
        search,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: result.blogs,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("Get All Blogs Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error getting all blogs" });
    }
  },

  getSpecificblog: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await blogService.getById(id);
      //   console.log(result);
      if (!result) return res.status(404).json({ message: "blog not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View blog Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error getting Blog blog" });
    }
  },
};

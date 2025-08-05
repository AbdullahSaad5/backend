import { Forum } from "@/models/forum.model";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const ForumController = {
  // Create a new forum post
  createForum: async (req: Request, res: Response) => {
    try {
      const { title, category, content, focusKeywords } = req.body;

      if (!title || !category || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Title, category, and content are required"
        });
      }

      const newForum = await Forum.create({
        title,
        category,
        content,
        focusKeywords: focusKeywords || []
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Forum created successfully",
        data: newForum
      });
    } catch (error: any) {
      console.error("Forum creation error:", error);

      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating forum post",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get all forum posts
  getAllForums: async (req: Request, res: Response) => {
    try {
      const forums = await Forum.find().sort({ createdAt: -1 });
      res.status(StatusCodes.OK).json({
        success: true,
        data: forums
      });
    } catch (error) {
      console.error("Error fetching forums:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching forum posts"
      });
    }
  },

  // Get a single forum post by ID
  getForumById: async (req: Request, res: Response) => {
    try {
      const forum = await Forum.findById(req.params.id);

      if (!forum) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum post not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: forum
      });
    } catch (error) {
      console.error("Error fetching forum:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching forum post"
      });
    }
  },

  // Update a forum post
  updateForum: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, category, content, focusKeywords } = req.body;

      const updatedForum = await Forum.findByIdAndUpdate(
        id,
        {
          title,
          category,
          content,
          focusKeywords
        },
        { new: true, runValidators: true }
      );

      if (!updatedForum) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum post not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Forum updated successfully",
        data: updatedForum
      });
    } catch (error: any) {
      console.error("Error updating forum:", error);

      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating forum post"
      });
    }
  },

  // Delete a forum post
  deleteForum: async (req: Request, res: Response) => {
    try {
      const deletedForum = await Forum.findByIdAndDelete(req.params.id);

      if (!deletedForum) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum post not found"
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Forum deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting forum:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting forum post"
      });
    }
  }
};
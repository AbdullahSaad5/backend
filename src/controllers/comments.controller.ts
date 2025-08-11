// controllers/comment.controller.ts

import { CommentModel } from "@/models/comment.model";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const CommentController = {
  // Get comments for a forum in nested format
  getCommentsByForum: async (req: Request, res: Response) => {
    try {
      const { forumId } = req.params;

      const comments = await CommentModel.find({ forumId })
        .sort({ timestamp: 1 })
        .lean();

      const map: Record<string, any> = {};
      const roots: any[] = [];

      comments.forEach(comment => {
        map[comment._id.toString()] = { ...comment, replies: [] };
      });

      comments.forEach(comment => {
        if (comment.parentId) {
          map[comment.parentId.toString()]?.replies.push(map[comment._id.toString()]);
        } else {
          roots.push(map[comment._id.toString()]);
        }
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: roots,
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching comments",
      });
    }
  },

  // // Add a root comment
  // addComment: async (req: Request, res: Response) => {
  //   try {
  //     const { forumId, author, avatar, content } = req.body;

  //     if (!forumId || !author || !content) {
  //       return res.status(StatusCodes.BAD_REQUEST).json({
  //         success: false,
  //         message: "forumId, author, and content are required",
  //       });
  //     }

  //     const newComment = await CommentModel.create({
  //       forumId,
  //       author,
  //       avatar: avatar || "",
  //       content,
  //       parentId: null,
  //     });

  //     res.status(StatusCodes.CREATED).json({
  //       success: true,
  //       message: "Comment added successfully",
  //       data: newComment,
  //     });
  //   } catch (error) {
  //     console.error("Error adding comment:", error);
  //     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: "Error adding comment",
  //     });
  //   }
  // },

  addComment: async (req: Request, res: Response) => {
    try {
      const { forumId, author, avatar, content, parentId } = req.body;

      if (!forumId || !author || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "forumId, author, and content are required"
        });
      }

      const newComment = await CommentModel.create({
        forumId,
        author,
        avatar,
        content,
        parentId: parentId || null
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: newComment
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating comment",
        error
      });
    }
  },

  // Add a reply to an existing comment
  replyToComment: async (req: Request, res: Response) => {
    try {
      const { parentId } = req.params;
      const { forumId, author, avatar, content } = req.body;

      if (!forumId || !author || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "forumId, author, and content are required",
        });
      }

      const parentComment = await CommentModel.findById(parentId);
      if (!parentComment) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Parent comment not found",
        });
      }

      const reply = await CommentModel.create({
        forumId,
        author,
        avatar: avatar || "",
        content,
        parentId,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Reply added successfully",
        data: reply,
      });
    } catch (error) {
      console.error("Error replying to comment:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error replying to comment",
      });
    }
  },

  // Like a comment
  likeComment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const comment = await CommentModel.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true }
      );

      if (!comment) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Comment not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      console.error("Error liking comment:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error liking comment",
      });
    }
  },

  // Dislike a comment
  dislikeComment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const comment = await CommentModel.findById(id);

      if (!comment) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Comment not found",
        });
      }

      comment.likes = Math.max(0, (comment.likes as number) - 1);
      await comment.save();

      res.status(StatusCodes.OK).json({
        success: true,
        data: comment,
      });
    } catch (error) {
      console.error("Error disliking comment:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error disliking comment",
      });
    }
  },

  // Delete a comment
  deleteComment: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await CommentModel.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Comment not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting comment",
      });
    }
  },
};

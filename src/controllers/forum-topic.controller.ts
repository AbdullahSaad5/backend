import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ForumTopic } from "@/models/forum-topic.model";

export const ForumTopicController = {
  // Create a new forum topic
  createForumTopic: async (req: Request, res: Response) => {
    try {
      const { topic, category, content } = req.body;

      if (!topic || !category || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Topic, category, and content are required",
          issueMessage: "Topic, category, and content are required" // For frontend compatibility
        });
      }

      const newForumTopic = await ForumTopic.create({
        topic,
        category,
        content
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Forum topic created successfully",
        data: newForumTopic
      });
    } catch (error: any) {
      console.error("Forum topic creation error:", error);

      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message,
          issueMessage: error.message // For frontend compatibility
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating forum topic",
        issueMessage: "Error creating forum topic", // For frontend compatibility
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Get all forum topics
  getAllForumTopics: async (req: Request, res: Response) => {
    try {
      const forumTopics = await ForumTopic.find().populate('category','name').sort({ createdAt: -1 });
      res.status(StatusCodes.OK).json({
        success: true,
        data: forumTopics
      });
    } catch (error) {
      console.error("Error fetching forum topics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching forum topics",
        issueMessage: "Error fetching forum topics" // For frontend compatibility
      });
    }
  },

  // Get a single forum topic by ID
  getForumTopicById: async (req: Request, res: Response) => {
    // console.log(req.params.id, 123);

    try {
      // const forumTopic = await ForumTopic.find({category:req.params.id}).populate('category','name');
      const forumTopic = await ForumTopic
      .findById(req.params.id)
      .populate('category', 'name');
      // console.log(forumTopic, 123);

      if (!forumTopic) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum topic not found",
          issueMessage: "Forum topic not found" // For frontend compatibility
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: forumTopic
      });
    } catch (error) {
      console.error("Error fetching forum topic:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching forum topic",
        issueMessage: "Error fetching forum topic" // For frontend compatibility
      });
    }
  },
   //Topic by category
  getForumTopicsByCategoryId: async (req: Request, res: Response) => {
  try {
    const forumTopics = await ForumTopic
      .find({ category: req.params.id })
      .populate('category', 'name');

    if (!forumTopics || forumTopics.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "No forum topics found for this category",
        issueMessage: "No forum topics found for this category"
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: forumTopics
    });
  } catch (error) {
    console.error("Error fetching forum topics by category:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error fetching forum topics",
      issueMessage: "Error fetching forum topics"
    });
  }
},


  // Update a forum topic
  updateForumTopic: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(id, 111111111)
      const { topic, category, content } = req.body;
      console.log(topic, category, content ,2222222)

      const updatedForumTopic = await ForumTopic.findByIdAndUpdate(
        id,
        {
          topic,
          category,
          content
        },
        { new: true, runValidators: true }
      );

      if (!updatedForumTopic) {

        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum topic not found",
          issueMessage: "Forum topic not found" // For frontend compatibility
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Forum topic updated successfully",
        data: updatedForumTopic
      });
    } catch (error: any) {
      console.error("Error updating forum topic:", error);

      if (error.name === "ValidationError") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message,
          issueMessage: error.message // For frontend compatibility
        });
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating forum topic",
        issueMessage: "Error updating forum topic" // For frontend compatibility
      });
    }
  },

  // Delete a forum topic
  deleteForumTopic: async (req: Request, res: Response) => {
    try {
      const deletedForumTopic = await ForumTopic.findByIdAndDelete(req.params.id);

      if (!deletedForumTopic) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Forum topic not found",
          issueMessage: "Forum topic not found" // For frontend compatibility
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Forum topic deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting forum topic:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting forum topic",
        issueMessage: "Error deleting forum topic" // For frontend compatibility
      });
    }
  },


};
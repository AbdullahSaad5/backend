
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { FaqService } from "@/services/faq.service";

export const FaqController = {
  createFaq: async (req: Request, res: Response) => {
    try {
      const { category, question, answer } = req.body;
      
      if (!category || !question || !answer) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Category, question and answer are required fields"
        });
      }

      const newFaq = await FaqService.createFaq(category, question, answer);

      res.status(StatusCodes.CREATED).json({ 
        success: true, 
        message: "FAQ created successfully", 
        data: newFaq 
      });
    } catch (error) {
      console.error("Error creating FAQ:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error creating FAQ" 
      });
    }
  },

  updateFaq: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { category, question, answer, isBlocked } = req.body;

      if (!id) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "FAQ ID is required"
        });
      }

      const updateData = {
        ...(category && { category }),
        ...(question && { question }),
        ...(answer && { answer }),
        ...(typeof isBlocked !== 'undefined' && { isBlocked })
      };

      const updatedFaq = await FaqService.updateFaq(id, updateData);

      if (!updatedFaq) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "FAQ updated successfully", 
        data: updatedFaq 
      });
    } catch (error) {
      console.error("Error updating FAQ:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error updating FAQ" 
      });
    }
  },

  deleteFaq: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deletedFaq = await FaqService.deleteFaq(id);

      if (!deletedFaq) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "FAQ deleted successfully", 
        data: deletedFaq 
      });
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error deleting FAQ" 
      });
    }
  },

  getAllFaqs: async (req: Request, res: Response) => {
    try {
      const { category, isBlocked } = req.query;
      
      const filter: { category?: string; isBlocked?: boolean } = {};
      if (category) filter.category = category as string;
      if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

      const faqs = await FaqService.getAllFaqs(filter.category);

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: faqs.length,
        data: faqs 
      });
    } catch (error) {
      console.error("Error getting FAQs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting FAQs" 
      });
    }
  },

  getFaqById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const faq = await FaqService.getFaqById(id);

      if (!faq) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "FAQ not found"
        });
      }

      res.status(StatusCodes.OK).json({ 
        success: true, 
        data: faq 
      });
    } catch (error) {
      console.error("Error getting FAQ:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting FAQ" 
      });
    }
  },

  getFaqsByCategory: async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const faqs = await FaqService.getByCategory(category);

      res.status(StatusCodes.OK).json({ 
        success: true, 
        count: faqs.length,
        data: faqs 
      });
    } catch (error) {
      console.error("Error getting FAQs by category:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        message: "Error getting FAQs by category" 
      });
    }
  }
};
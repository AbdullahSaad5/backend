import { websiteService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const websiteController = {
  getFeaturedCategoriesForWebsite: async (req: Request, res: Response) => {
    try {
      const categories =
        await websiteService.getFeaturedCategoriesForWebsite();
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("Get Featured Categories Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting featured categories",
      });
    }
  },
};

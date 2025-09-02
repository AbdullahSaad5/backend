import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { analyticsService } from "@/services";

export const analyticsController = {
  // Get complete user analytics data
  getCompleteUserAnalytics: async (req: Request, res: Response) => {
    try {
      const analytics = await analyticsService.getCompleteUserAnalytics();
      
      res.status(StatusCodes.OK).json({
        success: true,
        message: "User analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      console.error("Error fetching complete user analytics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Get user analytics overview (basic stats)
  getUserAnalyticsOverview: async (req: Request, res: Response) => {
    try {
      const overview = await analyticsService.getUserAnalyticsOverview();
      
      res.status(StatusCodes.OK).json({
        success: true,
        message: "User analytics overview retrieved successfully",
        data: overview,
      });
    } catch (error) {
      console.error("Error fetching user analytics overview:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user analytics overview",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Get user registration trends with monthly aggregation
  getUserRegistrationTrends: async (req: Request, res: Response) => {
    try {
      const { months = 12 } = req.query;
      const trends = await analyticsService.getUserRegistrationTrends(Number(months));
      
      res.status(StatusCodes.OK).json({
        success: true,
        message: "User registration trends retrieved successfully",
        data: trends,
      });
    } catch (error) {
      console.error("Error fetching user registration trends:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user registration trends",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Get user role distribution
  getUserRoleDistribution: async (req: Request, res: Response) => {
    try {
      const distribution = await analyticsService.getUserRoleDistribution();
      
      res.status(StatusCodes.OK).json({
        success: true,
        message: "User role distribution retrieved successfully",
        data: distribution,
      });
    } catch (error) {
      console.error("Error fetching user role distribution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user role distribution",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // Get user activity distribution
  getUserActivityDistribution: async (req: Request, res: Response) => {
    try {
      const distribution = await analyticsService.getUserActivityDistribution();
      
      res.status(StatusCodes.OK).json({
        success: true,
        message: "User activity distribution retrieved successfully",
        data: distribution,
      });
    } catch (error) {
      console.error("Error fetching user activity distribution:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user activity distribution",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};

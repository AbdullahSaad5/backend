import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { announcementBarService } from "@/services";

export const announcementBarController = {
  // Create a new announcement bar
  createAnnouncementBar: async (req: Request, res: Response) => {
    try {
      // If this announcement bar is being set as active, provide a more specific message
      const isBeingSetActive = req.body.isActive === true;
      
      const announcementBar = await announcementBarService.createAnnouncementBar(req.body);
      
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: isBeingSetActive 
          ? "Announcement bar created successfully and set as active (all other announcements were deactivated)"
          : "Announcement bar created successfully",
        data: announcementBar,
      });
    } catch (error) {
      console.error("Error creating announcement bar:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create announcement bar",
        data: null,
      });
    }
  },

  // Get all announcement bars
  getAnnouncementBars: async (_req: Request, res: Response) => {
    try {
      const announcementBars = await announcementBarService.getAnnouncementBars();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched announcement bars successfully",
        data: announcementBars,
      });
    } catch (error) {
      console.error("Error fetching announcement bars:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch announcement bars",
        data: null,
      });
    }
  },

  // Get active announcement bar
  getActiveAnnouncementBar: async (_req: Request, res: Response) => {
    try {
      const announcementBar = await announcementBarService.getActiveAnnouncementBar();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched active announcement bar successfully",
        data: announcementBar,
      });
    } catch (error) {
      console.error("Error fetching active announcement bar:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch active announcement bar",
        data: null,
      });
    }
  },

  // Update announcement bar
  updateAnnouncementBar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Check if this update is setting the announcement bar to active
      const isBeingSetActive = req.body.isActive === true;
      
      const updated = await announcementBarService.updateAnnouncementBar(id, req.body);
      
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Announcement bar not found",
          data: null,
        });
      }
      
      return res.status(StatusCodes.OK).json({
        success: true,
        message: isBeingSetActive 
          ? "Announcement bar updated and set as active (all other announcements were deactivated)"
          : "Announcement bar updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating announcement bar:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update announcement bar",
        data: null,
      });
    }
  },

  // Delete announcement bar
  deleteAnnouncementBar: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await announcementBarService.deleteAnnouncementBar(id);
      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Announcement bar not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Announcement bar deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Error deleting announcement bar:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete announcement bar",
        data: null,
      });
    }
  },
};

import { Request, Response } from "express";
import { heroSliderService } from "@/services";
import { StatusCodes } from "http-status-codes";

export const heroSliderController = {
  // Create a new hero slider slide
  createSlide: async (req: Request, res: Response) => {
    try {
      console.log("[createSlide] Request body:", req.body);
      let slideData = { ...req.body };
      if (req.file && (req.file as any).location) {
        slideData.imageUrl = (req.file as any).location;
      }
      const slide = await heroSliderService.createSlide(slideData);
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Slide created successfully",
        data: slide,
      });
    } catch (error) {
      console.error("Error creating hero slider slide:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        ("status" in error || "statusCode" in error) &&
        ((typeof (error as any).status === "number" && (error as any).status === StatusCodes.BAD_REQUEST) ||
          (typeof (error as any).statusCode === "number" && (error as any).statusCode === StatusCodes.BAD_REQUEST))
      ) {
        console.error("[createSlide] Status 400 - Bad Request. Request body:", req.body);
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create slide",
        data: null,
      });
    }
  },

  // Get all slides
  getSlides: async (_req: Request, res: Response) => {
    try {
      const slides = await heroSliderService.getSlides();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched hero slider slides successfully",
        data: slides,
      });
    } catch (error) {
      console.error("Error fetching hero slider slides:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch slides",
        data: null,
      });
    }
  },

  // Get active slides only
  getActiveSlides: async (_req: Request, res: Response) => {
    try {
      const slides = await heroSliderService.getActiveSlides();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched active hero slider slides successfully",
        data: slides,
      });
    } catch (error) {
      console.error("Error fetching active hero slider slides:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch active slides",
        data: null,
      });
    }
  },

  // Update a slide
  updateSlide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let updateData = { ...req.body };
      if (req.file && (req.file as any).location) {
        updateData.imageUrl = (req.file as any).location;
      }
      const updated = await heroSliderService.updateSlide(id, updateData);
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Slide not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Slide updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating hero slider slide:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update slide",
        data: null,
      });
    }
  },

  // Update slide status only
  updateSlideStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !["active", "inactive"].includes(status)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid status. Must be 'active' or 'inactive'",
          data: null,
        });
      }

      const updated = await heroSliderService.updateSlide(id, { status });
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Slide not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Slide status updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating hero slider slide status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update slide status",
        data: null,
      });
    }
  },

  // Delete a slide
  deleteSlide: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await heroSliderService.deleteSlide(id);
      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Slide not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Slide deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Error deleting hero slider slide:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete slide",
        data: null,
      });
    }
  },
};

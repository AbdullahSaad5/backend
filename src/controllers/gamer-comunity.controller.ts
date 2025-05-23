import { GamerComunityService } from "@/services/gamer-comunity.service";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const gamercomunityController = {
  addgamercomunity: async (req: Request, res: Response) => {
    try {
      const { title, description, image, privacy } = req.body;
      console.log(title, description, image, privacy);
      const newgamercomunity = await GamerComunityService.creategamercomunity(title, description, image, privacy);
      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: "gamercomunity gamercomunity created successfully", data: newgamercomunity });
    } catch (error: any) {
      console.error(error);
      if (error.title === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]; 
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        // console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating gamercomunity" });
      }
    }
  },

  editgamercomunity: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, image, privacy } = req.body;
      const gamercomunity = await GamerComunityService.editgamercomunity(id, { title, description, image , privacy });
      res.status(StatusCodes.OK).json({ success: true, message: "gamercomunity updated successfully", data: gamercomunity });
    } catch (error: any) {
      if (error.title === "MongoServerError" && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error updating gamercomunity gamercomunity" });
      }
    }
  },

  deletegamercomunity: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await GamerComunityService.deletegamercomunity(id);
      res.status(StatusCodes.OK).json({ success: true, message: "gamercomunity deleted successfully", deletedUser: result });
    } catch (error) {
      console.error("Delete gamercomunity Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting gamercomunity gamercomunity" });
    }
  },

  getAllgamercomunity: async (req: Request, res: Response) => {
    try {
      const categories = await GamerComunityService.getAllgamercomunitys();
      console.log(categories);
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting all gamercomunity categories" });
    }
  },

  getSpecificgamercomunity: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await GamerComunityService.getgamercomunityById(id);
      //   console.log(result);
      if (!result) return res.status(404).json({ message: "gamercomunity not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View gamercomunity Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting gamercomunity gamercomunity" });
    }
  },

 
};

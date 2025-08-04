import { Request, Response } from "express";
import { IContextRequest } from "@/contracts/request.contract";
import { locationService } from "@/services/location.service";
import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";

export const locationController = {
  // Get all locations
  getAllLocations: async (req: IContextRequest<any>, res: Response) => {
    try {
      const locations = await locationService.getAllLocations();
      res.status(StatusCodes.OK).json(locations);
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
  },

  // Create a new location
  createLocation: async (req: IContextRequest<any>, res: Response) => {
    try {
      const userId = req.context?.user?.id;

      if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
      }

      const location = await locationService.createLocation({
        ...req.body,
        createdBy: new Types.ObjectId(userId),
      });
      res.status(StatusCodes.CREATED).json(location);
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
  },

  // Update a location
  updateLocation: async (req: Request, res: Response) => {
    try {
      const { locationId } = req.params;
      const location = await locationService.updateLocation(locationId, req.body);
      if (!location) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Location not found" });
      }
      res.status(StatusCodes.OK).json(location);
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
  },

  // Delete a location
  deleteLocation: async (req: Request, res: Response) => {
    try {
      const { locationId } = req.params;
      const location = await locationService.deleteLocation(locationId);
      if (!location) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Location not found" });
      }
      res.status(StatusCodes.OK).json({ message: "Location deleted successfully" });
    } catch (err: any) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: err.message });
    }
  },
};

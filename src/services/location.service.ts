import { ILocation, ILocationCreate, ILocationUpdate } from "@/contracts/location.contract";
import { Location } from "@/models/location.model";
import { Types } from "mongoose";

export const locationService = {
  // Get all locations
  getAllLocations: async (): Promise<ILocation[]> => {
    return Location.find({ isActive: true });
  },

  // Create a new location
  createLocation: async (locationData: ILocationCreate): Promise<ILocation> => {
    const location = new Location(locationData);
    return location.save();
  },

  // Update a location
  updateLocation: async (locationId: string, updateData: ILocationUpdate): Promise<ILocation | null> => {
    return Location.findByIdAndUpdate(locationId, updateData, { new: true });
  },

  // Delete a location (soft delete)
  deleteLocation: async (locationId: string): Promise<ILocation | null> => {
    return Location.findByIdAndUpdate(locationId, { isActive: false }, { new: true });
  },
};

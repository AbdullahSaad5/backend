import { NextFunction, Response } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { z } from "zod";
import { Types } from "mongoose";
import { IBodyRequest } from "@/contracts/request.contract";
import { getZodErrors } from "@/utils/get-zod-errors.util";

// Custom Zod validation for MongoDB ObjectId
const objectId = z.instanceof(Types.ObjectId).or(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"));

const locationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  address: z.string().trim().min(1, "Address is required"),
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  radius: z
    .number()
    .min(50, "Radius must be between 50 and 1000 meters")
    .max(1000, "Radius must be between 50 and 1000 meters")
    .default(100),
  isActive: z.boolean().default(true),
});

const updateLocationSchema = locationSchema.partial();

export const locationValidation = {
  validateCreate: (req: IBodyRequest<z.infer<typeof locationSchema>>, res: Response, next: NextFunction) => {
    try {
      locationSchema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          errors: getZodErrors(error),
        });
      }
      next(error);
    }
  },

  validateUpdate: (req: IBodyRequest<z.infer<typeof updateLocationSchema>>, res: Response, next: NextFunction) => {
    try {
      updateLocationSchema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: ReasonPhrases.BAD_REQUEST,
          errors: getZodErrors(error),
        });
      }
      next(error);
    }
  },
};

import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

// Base schema
const baseSchema = {
  announcementText: z
    .string()
    .min(1, "Announcement text is required")
    .max(150, "Announcement text must be less than 150 characters"),
  isActive: z.boolean().default(false),
};

// Schema for creating announcement bar
export const createAnnouncementBarSchema = z.object({
  ...baseSchema,
});

// Schema for updating announcement bar
export const updateAnnouncementBarSchema = z
  .object({
    announcementText: z.string().min(1).max(150).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Validation middleware functions
const validateCreate = (req: Request, res: Response, next: NextFunction) => {
  try {
    createAnnouncementBarSchema.parse(req.body);
    next();
  } catch (error) {
    let errors = error;
    if (error instanceof z.ZodError) {
      errors = error.errors;
    }
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: ReasonPhrases.BAD_REQUEST,
      errors,
    });
  }
};

const validateUpdate = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateAnnouncementBarSchema.parse(req.body);
    next();
  } catch (error) {
    let errors = error;
    if (error instanceof z.ZodError) {
      errors = error.errors;
    }
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: ReasonPhrases.BAD_REQUEST,
      errors,
    });
  }
};

export const AnnouncementBarValidation = {
  create: validateCreate,
  update: validateUpdate,
};

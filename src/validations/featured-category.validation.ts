import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const featuredCategorySchema = z.object({
  categoryTitle: z.string().min(1),
  categorySubtitle: z.string().min(1),
  imageUrl: z.string().url(),
  status: z.enum(["active", "inactive"]),
  buttonText: z.string().min(1),
  buttonLink: z.string().url(),
});

export const featuredCategoryValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    featuredCategorySchema.parse(req.body);
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

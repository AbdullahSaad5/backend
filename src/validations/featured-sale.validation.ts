import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const featuredSaleSchema = z.object({
  saleTitle: z.string().min(1),
  saleSubtitle: z.string().min(1),
  imageUrl: z.string().url().optional(),
  status: z.enum(["active", "inactive"]),
  buttonText: z.string().min(1),
  buttonLink: z.string().url(),
});

export const featuredSaleStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const featuredSaleValidation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    featuredSaleSchema.parse(req.body);
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

export const featuredSaleStatusValidation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    featuredSaleStatusSchema.parse(req.body);
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

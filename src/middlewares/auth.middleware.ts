import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

import { getAccessTokenFromHeaders } from "@/utils/headers.util";
import { jwtVerify } from "@/utils/jwt.util";
// import { userService } from "@/services";
import { authService } from "@/services";
import { User } from "@/models/user.model";

export const authMiddleware = async (
  req: Request,
  _: Response,
  next: NextFunction
): Promise<void> => {
  try {
    Object.assign(req, { context: {} });

    const { accessToken } = getAccessTokenFromHeaders(req.headers);
    if (!accessToken) return next();

    // console.log("accessToken : " , accessToken)

    const { id } = jwtVerify(accessToken);
    if (!id) return next();

    // console.log("id : " , id)

    const user = await authService.findUserById(id.toString(), "+password");
    if (!user) return next();

    // console.log("User : " , user)

    Object.assign(req, {
      context: {
        user,
        accessToken,
      },
    });

    return next();
  } catch (error) {
    Object.assign(req, { context: {} });
    return next();
  }
};

export const shiftValidator = {
  // Validation schema for creating/updating a shift
  validateShift: (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
      shiftName: Joi.string().required().max(50),
      shiftDescription: Joi.string().required(),
      startTime: Joi.string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
          "string.pattern.base": "Start time must be in HH:MM format",
        }),
      endTime: Joi.string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .required()
        .messages({
          "string.pattern.base": "End time must be in HH:MM format",
        }),
      employees: Joi.array().items(Joi.string()).min(1).required(),
    }).custom((value, helpers) => {
      if (value.startTime >= value.endTime) {
        return helpers.error("any.invalid");
      }
      return value;
    });

    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));

      // Special handling for time validation
      if (error.details.some((d) => d.type === "any.invalid")) {
        errors.push({
          field: "endTime",
          message: "End time must be after start time",
        });
      }

      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  },
};

// Simple admin role check middleware
export const adminRoleCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let user: any = req.context?.user;
  if (!user) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  // If userType is missing, fetch full user from DB
  if (
    !user.userType ||
    typeof user.userType !== "object" ||
    !("role" in user.userType)
  ) {
    const dbUser = await User.findById(user.id).populate("userType");
    if (
      !dbUser ||
      !dbUser.userType ||
      typeof dbUser.userType !== "object" ||
      !("role" in dbUser.userType)
    ) {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    user = dbUser;
    if (req.context) req.context.user = user;
  }
  if (user.userType.role !== "admin" && user.userType.role !== "super admin") {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
};

import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken';

import { getAccessTokenFromHeaders } from "@/utils/headers.util";
import { jwtVerify } from "@/utils/jwt.util";
// import { userService } from "@/services";
import { authService } from "@/services";

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


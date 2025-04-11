import { NextFunction, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

import { IContextRequest, IUserRequest } from "@/contracts/request.contract";

export const authGuard = {
  isAuth: (
    { context: { user } }: IContextRequest<IUserRequest>,
    res: Response,
    next: NextFunction
  ) => {
    // console.log("User in Guard:", user);play

    if (user) {
      return next();
    }

    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: ReasonPhrases.UNAUTHORIZED,
      status: StatusCodes.UNAUTHORIZED,
    });
  },
};
// isAdmin: ({ context: { user } }: IContextRequest<IUserRequest>, res: Response, next: NextFunction) => {
//   if (user.role === "admin") {
//     return next();
//   }
//   return res.status(StatusCodes.FORBIDDEN).json({
//     message: ReasonPhrases.FORBIDDEN,
//     status: StatusCodes.FORBIDDEN,
//   });
// },

// isGuest: ({ context: { user } }: IContextRequest<IUserRequest>, res: Response, next: NextFunction) => {
//   if (!user) {
//     return next();
//   }

//   return res.status(StatusCodes.FORBIDDEN).json({
//     message: ReasonPhrases.FORBIDDEN,
//     status: StatusCodes.FORBIDDEN,
//   });
// },
// isEmailVerified: (
//   {
//     context: {
//       user: { emailVerified },
//     },
//   }: IContextRequest<IUserRequest>,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (emailVerified) {
//     return next();
//   }

//   return res.status(StatusCodes.FORBIDDEN).json({
//     message: ReasonPhrases.FORBIDDEN,
//     status: StatusCodes.FORBIDDEN,
//   });
// },

// isUnverified: (
//   {
//     context: {
//       user: { emailVerified },
//     },
//   }: IContextRequest<IUserRequest>,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (!emailVerified) {
//     return next();
//   }

//   return res.status(StatusCodes.FORBIDDEN).json({
//     message: ReasonPhrases.FORBIDDEN,
//     status: StatusCodes.FORBIDDEN,
//   });
// },

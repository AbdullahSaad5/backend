import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const meController = {
  info: (req: Request, res: Response) => {
    try {
      const user = req.context?.user;
      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "User not found or unAuthorized" });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Logedin User Info",
        user: user,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting logedin user info",
      });
    }
  },
};

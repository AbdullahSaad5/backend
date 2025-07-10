import { Request, Response } from "express";
import { employeeService } from "@/services/employee.service";
import { jwtVerify } from "@/utils/jwt.util";

export const employeeController = {
  getEmployeeList: async (req: Request, res: Response) => {
    try {
      const result = await employeeService.getEmployeeList();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch employee list",
        error: error.message,
      });
    }
  },

  getMyInfo: async (req: any, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      console.log("token : ", token);
      // decode token
      const decoded = jwtVerify(token as string);
      const userId = decoded.id.toString();

      const result = await employeeService.getEmployeeProfileDetails(userId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch profile details",
        error: error.message,
      });
    }
  },

  getEmployeeProfileDetails: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "User ID is required" });
      }
      const result = await employeeService.getEmployeeProfileDetails(userId);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch employee profile details",
        error: error.message,
      });
    }
  },
};

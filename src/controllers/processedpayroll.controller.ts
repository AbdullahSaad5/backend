import { Request, Response } from "express";
import { processedPayrollService } from "../services/processedpayroll.service";
import { authService } from "../services/user-auth.service";
import { jwtVerify } from "@/utils/jwt.util";

export const processedPayrollController = {
  async createProcessedPayroll(req: Request, res: Response) {
    try {
      // Extract token from Authorization header
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "Authorization token is required" });
      }
      // Decode token to get user id
      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      // Find user by id
      const user = await authService.findUserById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      // Prepare processedBy and processedAt
      const processedBy = user._id;
      const processedAt = new Date();
      // Merge with request body
      const data = { ...req.body, processedBy, processedAt };
      const processedPayroll =
        await processedPayrollService.createProcessedPayroll(data);
      res.status(201).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getAllProcessedPayrolls(_req: Request, res: Response) {
    try {
      const processedPayrolls =
        await processedPayrollService.getAllProcessedPayrolls();
      res.status(200).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getProcessedPayrollById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const processedPayroll =
        await processedPayrollService.getProcessedPayrollById(id);
      if (!processedPayroll) {
        return res
          .status(404)
          .json({ success: false, message: "Processed payroll not found" });
      }
      res.status(200).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateProcessedPayrollById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const update = req.body;
      console.log("Update data: ", update);

      const processedPayroll =
        await processedPayrollService.updateProcessedPayrollById(id, update);
      if (!processedPayroll) {
        return res
          .status(404)
          .json({ success: false, message: "Processed payroll not found" });
      }
      res.status(200).json({ success: true, data: processedPayroll });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

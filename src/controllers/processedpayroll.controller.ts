import { Request, Response } from "express";
import { processedPayrollService } from "../services/processedpayroll.service";
import { authService } from "../services/user-auth.service";
import { jwtVerify } from "@/utils/jwt.util";
import { PayrollType } from "@/contracts/payroll.contract";

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

  async createDualProcessedPayrolls(req: Request, res: Response) {
    try {
      console.log("createDualProcessedPayrolls called with body:", req.body);

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

      const { actualData, governmentData } = req.body;
      console.log("Received data:", { actualData, governmentData });

      // Merge with request body
      const actualPayload = { ...actualData, processedBy, processedAt };
      const governmentPayload = { ...governmentData, processedBy, processedAt };
      console.log("Prepared payloads:", { actualPayload, governmentPayload });

      const processedPayrolls =
        await processedPayrollService.createDualProcessedPayrolls(
          actualPayload,
          governmentPayload
        );

      console.log("Created payrolls:", processedPayrolls);
      res.status(201).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      console.error("Error in createDualProcessedPayrolls:", error);
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

  async getProcessedPayrollsByEmployeeAndPeriod(req: Request, res: Response) {
    try {
      const { employeeId, startDate, endDate } = req.params;
      const processedPayrolls =
        await processedPayrollService.getProcessedPayrollsByEmployeeAndPeriod(
          employeeId,
          new Date(startDate),
          new Date(endDate)
        );
      res.status(200).json({ success: true, data: processedPayrolls });
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

  async updateDualProcessedPayrolls(req: Request, res: Response) {
    try {
      const { actualId, governmentId } = req.params;
      const { actualUpdate, governmentUpdate } = req.body;

      const processedPayrolls =
        await processedPayrollService.updateDualProcessedPayrolls(
          actualId,
          governmentId,
          actualUpdate,
          governmentUpdate
        );

      res.status(200).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getMergedProcessedPayrollByUserId(req: Request, res: Response) {
    try {
      const { userId, month, year } = req.params;
      const monthNumber = parseInt(month);
      const yearNumber = parseInt(year);

      if (monthNumber < 1 || monthNumber > 12) {
        return res.status(400).json({
          success: false,
          message: "Invalid month. Month must be between 1 and 12.",
        });
      }

      const processedPayrolls =
        await processedPayrollService.getMergedProcessedPayrollByUserId(
          userId,
          monthNumber,
          yearNumber
        );

      res.status(200).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async updateMergedProcessedPayroll(req: Request, res: Response) {
    try {
      const { userId, month, year } = req.params;
      const monthNumber = parseInt(month);
      const yearNumber = parseInt(year);
      const updateData = req.body;

      console.log("updateMergedProcessedPayroll called with:");
      console.log("userId:", userId);
      console.log("month:", monthNumber);
      console.log("year:", yearNumber);
      console.log("updateData:", updateData);

      if (monthNumber < 1 || monthNumber > 12) {
        return res.status(400).json({
          success: false,
          message: "Invalid month. Month must be between 1 and 12.",
        });
      }

      const processedPayrolls =
        await processedPayrollService.updateMergedProcessedPayroll(
          userId,
          monthNumber,
          yearNumber,
          updateData
        );

      console.log("Updated payrolls:", processedPayrolls);

      res.status(200).json({ success: true, data: processedPayrolls });
    } catch (error: any) {
      console.error("Error in updateMergedProcessedPayroll:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

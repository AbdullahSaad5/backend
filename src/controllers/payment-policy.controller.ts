// Updated Controller
import { paymentPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const paymentPolicyController = {
  createPaymentPolicy: async (req: Request, res: Response) => {
    try {
      const paymentPolicy = await paymentPolicyService.createPaymentPolicy(req.body);
      res.status(StatusCodes.CREATED).json({
        message: "Payment policy created successfully",
        paymentPolicy,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating payment policy" });
    }
  },

  getAllPaymentPolicies: async (_req: Request, res: Response) => {
    try {
      const paymentPolicies = await paymentPolicyService.getAllPaymentPolicies();
      res.status(StatusCodes.OK).json(paymentPolicies);
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching payment policies" });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await paymentPolicyService.getById(id);
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      res.status(StatusCodes.OK).json({ success: true, data: policy });
    } catch (error) {
      console.error("View Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error getting policy" });
    }
  },

  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await paymentPolicyService.editPolicy(id, req.body);
      res.status(StatusCodes.OK).json({ success: true, message: "Policy updated successfully", data: policy });
    } catch (error) {
      console.error("Edit Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating policy" });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await paymentPolicyService.deletePolicy(id);
      res.status(StatusCodes.OK).json({ success: true, message: "Policy deleted successfully", deletedPolicy: result });
    } catch (error) {
      console.error("Delete Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting policy" });
    }
  },
  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
    //   console.log(object)
      const result = await paymentPolicyService.toggleBlock(id, isBlocked);
      res.status(StatusCodes.OK).json({
        success: true,
        message: `Policy ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: result,
      });
    } catch (error) {
      console.error("Toggle Block Policy Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating policy status" });
    }
  },

};


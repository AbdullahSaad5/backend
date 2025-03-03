import { paymentPolicyService, ebayPaymentPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const paymentPolicyController = {
  createPaymentPolicy: async (req: Request, res: Response) => {
    try {
      // Create policy in DB
      const paymentPolicy = await paymentPolicyService.createPaymentPolicy(
        req.body
      );

      // Sync with eBay
      const ebayResponse = await ebayPaymentPolicyService.createPaymentPolicy(
        req.body
      ); // ✅ Fixed (passing req.body)

      res.status(StatusCodes.CREATED).json({
        message: "Payment policy created successfully",
        paymentPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Payment Policy Error:", error.message);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating payment policy" });
    }
  },

  getAllPaymentPolicies: async (_req: Request, res: Response) => {
    try {
      const paymentPolicies =
        await paymentPolicyService.getAllPaymentPolicies();
      const ebayPolicies = await ebayPaymentPolicyService.getAllPaymentPolicies(
        _req,
        res
      );
      res.status(StatusCodes.OK).json({ paymentPolicies, ebayPolicies });
    } catch (error: any) {
      console.error("Get Payment Policies Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching payment policies" });
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
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting policy" });
    }
  },

  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await paymentPolicyService.editPolicy(id, req.body);
      const ebayResponse =
        await ebayPaymentPolicyService.createPaymentPolicy(req);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy updated successfully",
        data: policy,
        ebayResponse,
      });
    } catch (error) {
      console.error("Edit Policy Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating policy" });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await paymentPolicyService.deletePolicy(id);
      const ebayResponse =
        await ebayPaymentPolicyService.deletePaymentPolicy(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy deleted successfully",
        deletedPolicy: result,
        ebayResponse,
      });
    } catch (error) {
      console.error("Delete Policy Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting policy" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
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

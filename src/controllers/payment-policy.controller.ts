import { paymentPolicyService, ebayPaymentPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const paymentPolicyController = {
  createPaymentPolicy: async (req: Request, res: Response) => {
    try {
      console.log("📩 Received request to create payment policy on eBay", JSON.stringify(req.body, null, 2));

      const ebayResponse = await ebayPaymentPolicyService.createPaymentPolicy(req.body);

      if (!ebayResponse || !ebayResponse.policyId) {
        console.error("❌ eBay failed to create payment policy.", ebayResponse);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to create payment policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.CREATED).json({
        message: "Payment policy created successfully on eBay",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Payment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating payment policy on eBay",
        error: error.message,
      });
    }
  },

  getAllPaymentPolicies: async (req: Request, res: Response) => {
    try {
      const ebayPolicies = await ebayPaymentPolicyService.getAllPaymentPolicies(req, res);
      res.status(StatusCodes.OK).json({ ebayPolicies });
    } catch (error: any) {
      console.error("❌ Error fetching eBay payment policies:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching eBay payment policies" });
    }
  },
  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { paymentPolicyId } = req.params;
      const ebayPolicy = await ebayPaymentPolicyService.getById(paymentPolicyId);

      if (!ebayPolicy || (ebayPolicy as any).errors) {
        return res.status(404).json({ message: "Policy not found on eBay" });
      }

      res.status(StatusCodes.OK).json({ success: true, data: ebayPolicy });
    } catch (error) {
      console.error("❌ Error getting eBay policy:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error fetching eBay policy" });
    }
  },
  editPolicy: async (req: Request, res: Response) => {
    try {
      const { paymentPolicyId } = req.params;

      console.log("📩 Received request to edit eBay payment policy", paymentPolicyId, JSON.stringify(req.body, null, 2));

      const ebayResponse = await ebayPaymentPolicyService.editPaymentPolicy(paymentPolicyId, req.body);

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error("❌ eBay failed to update payment policy.", ebayResponse);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to update payment policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Payment policy updated successfully on eBay",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Payment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error updating payment policy on eBay",
        error: error.message,
      });
    }
  },
  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { paymentPolicyId } = req.params;

      console.log("📩 Received request to delete eBay payment policy", paymentPolicyId);

      const ebayResponse = await ebayPaymentPolicyService.deletePaymentPolicy(paymentPolicyId);

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error("❌ eBay failed to delete payment policy.", ebayResponse);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to delete payment policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        message: "Payment policy deleted successfully on eBay",
      });
    } catch (error: any) {
      console.error("❌ Delete Payment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error deleting payment policy on eBay",
        error: error.message,
      });
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
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating policy status" });
    }
  },
};

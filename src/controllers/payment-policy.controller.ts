import { paymentPolicyService, ebayPaymentPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const paymentPolicyController = {
  createPaymentPolicy: async (req: Request, res: Response) => {
    try {
      console.log(
        "📩 Received request to create payment policy",
        JSON.stringify(req.body, null, 2)
      );

      // ✅ Sync with eBay API first
      const ebayResponse = await ebayPaymentPolicyService.createPaymentPolicy(
        req.body
      );

      if (!ebayResponse || !ebayResponse.policyId) {
        console.error(
          "❌ eBay failed to create payment policy. Aborting DB save.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to create payment policy on eBay. Policy not saved in database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay payment policy created successfully. Proceeding to save in DB.",
        ebayResponse.policyId
      );

      // ✅ Create policy in DB only if eBay creation was successful
      const paymentPolicy = await paymentPolicyService.createPaymentPolicy({
        ...req.body,
        ebayPolicyId: ebayResponse.policyId,
      });

      res.status(StatusCodes.CREATED).json({
        message:
          "Payment policy created successfully on both eBay and database",
        paymentPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Payment Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error,
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating payment policy",
        error: error.message,
      });
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
      console.log(
        "📩 Received request to edit payment policy",
        id,
        JSON.stringify(req.body, null, 2)
      );

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await paymentPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Payment policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;
      console.log("🔄 Syncing update with eBay for Policy ID:", ebayPolicyId);

      // ✅ Sync update with eBay API first
      const ebayResponse = await ebayPaymentPolicyService.editPaymentPolicy(
        ebayPolicyId,
        req.body
      );

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to update payment policy. Aborting DB update.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to update payment policy on eBay. Policy not updated in database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay payment policy updated successfully. Proceeding to update in DB."
      );

      // ✅ Update policy in DB only if eBay update was successful
      const policy = await paymentPolicyService.editPolicy(id, req.body);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy updated successfully on both eBay and database",
        data: policy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Payment Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error,
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating payment policy",
        error: error.message,
      });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log("📩 Received request to delete payment policy", id);

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await paymentPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Payment policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;

      // ✅ Sync delete with eBay API first
      const ebayResponse =
        await ebayPaymentPolicyService.deletePaymentPolicy(ebayPolicyId);

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to delete payment policy. Aborting DB delete.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to delete payment policy on eBay. Policy not deleted from database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay payment policy deleted successfully. Proceeding to delete in DB."
      );

      await paymentPolicyService.deletePolicy(id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy deleted successfully from both eBay and database",
      });
    } catch (error: any) {
      console.error("❌ Delete Payment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting payment policy",
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
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error updating policy status" });
    }
  },
};

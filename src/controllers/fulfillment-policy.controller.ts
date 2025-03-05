import {
  fulfillmentPolicyService,
  ebayFulfillmentPolicyService,
} from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const fulfillmentPolicyController = {
  createFulfillmentPolicy: async (req: Request, res: Response) => {
    try {
      console.log("📩 Received request to create fulfillment policy", {
        body: req.body,
      });

      // ✅ Validate Request Data
      if (!req.body.marketplaceId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "❌ Missing required field: marketplaceId",
        });
      }

      // ✅ Sync with eBay API First

      const ebayResponse =
        await ebayFulfillmentPolicyService.createEbayFulfillmentPolicy(
          req.body
        );

      console.log(
        "🔍 eBay Fulfillment Policy Response:",
        JSON.stringify(ebayResponse, null, 2)
      );

      if (!ebayResponse?.fulfillmentPolicy?.fulfillmentPolicyId) {
        console.error("❌ eBay failed to create fulfillment policy.", {
          ebayResponse,
        });
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to create fulfillment policy on eBay. Policy not saved in database.",
          ebayResponse,
        });
      }

      const policyId = ebayResponse.fulfillmentPolicy.fulfillmentPolicyId;

      console.log(
        "✅ eBay fulfillment policy created. Proceeding to save in DB.",
        { policyId }
      );

      const fulfillmentPolicy =
        await fulfillmentPolicyService.createFulfillmentPolicy({
          ...req.body,
          ebayPolicyId: policyId,
        });

      return res.status(StatusCodes.CREATED).json({
        message:
          "Fulfillment policy created successfully on both eBay and database",
        fulfillmentPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Fulfillment Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating fulfillment policy",
        error: error.message,
      });
    }
  },
  getAllFulfillmentPolicies: async (_req: Request, res: Response) => {
    try {
      const fulfillmentPolicies =
        await fulfillmentPolicyService.getAllFulfillmentPolicies();
      const ebayPolicies =
        await ebayFulfillmentPolicyService.getAllFulfillmentPolicies(_req, res);
      res.status(StatusCodes.OK).json({ fulfillmentPolicies, ebayPolicies });
    } catch (error: any) {
      console.error("Get Fulfillment Policies Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching fulfillment policies" });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await fulfillmentPolicyService.getById(id);
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
        "📩 Received request to edit fulfillment policy",
        id,
        JSON.stringify(req.body, null, 2)
      );

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await fulfillmentPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Fulfillment policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;
      console.log("🔄 Syncing update with eBay for Policy ID:", ebayPolicyId);

      // ✅ Sync update with eBay API first
      const ebayResponse =
        await ebayFulfillmentPolicyService.editFulfillmentPolicy(
          ebayPolicyId,
          req.body
        );

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to update fulfillment policy. Aborting DB update.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to update fulfillment policy on eBay. Policy not updated in database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay fulfillment policy updated successfully. Proceeding to update in DB."
      );

      // ✅ Update policy in DB only if eBay update was successful
      const policy = await fulfillmentPolicyService.editPolicy(id, req.body);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy updated successfully on both eBay and database",
        data: policy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Fulfillment Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error,
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating fulfillment policy",
        error: error.message,
      });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log("📩 Received request to delete fulfillment policy", id);

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await fulfillmentPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Fulfillment policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;

      // ✅ Sync delete with eBay API first
      const ebayResponse =
        await ebayFulfillmentPolicyService.deleteFulfillmentPolicy(
          ebayPolicyId
        );

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to delete fulfillment policy. Aborting DB delete.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to delete fulfillment policy on eBay. Policy not deleted from database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay fulfillment policy deleted successfully. Proceeding to delete in DB."
      );

      await fulfillmentPolicyService.deletePolicy(id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy deleted successfully from both eBay and database",
      });
    } catch (error: any) {
      console.error("❌ Delete Fulfillment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting fulfillment policy",
        error: error.message,
      });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const result = await fulfillmentPolicyService.toggleBlock(id, isBlocked);
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

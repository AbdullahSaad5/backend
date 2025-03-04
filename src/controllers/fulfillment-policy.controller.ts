import {
  fulfillmentPolicyService,
  ebayFulfillmentPolicyService,
} from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const fulfillmentPolicyController = {
  createFulfillmentPolicy: async (req: Request, res: Response) => {
    try {
      // Create policy in DB
      const fulfillmentPolicy =
        await fulfillmentPolicyService.createFulfillmentPolicy(req.body);

      // Sync with eBay
      const ebayResponse =
        await ebayFulfillmentPolicyService.createFulfillmentPolicy(req.body); // ✅ Fixed (passing req.body)

      res.status(StatusCodes.CREATED).json({
        message: "Fulfillment policy created successfully",
        fulfillmentPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Fulfillment Policy Error:", error.message);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error creating fulfillment policy" });
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
      const policy = await fulfillmentPolicyService.editPolicy(id, req.body);
      const ebayResponse =
        await ebayFulfillmentPolicyService.editFulfillmentPolicy(id, req.body);

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
      const result = await fulfillmentPolicyService.deletePolicy(id);
      const ebayResponse =
        await ebayFulfillmentPolicyService.deleteFulfillmentPolicy(id);
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

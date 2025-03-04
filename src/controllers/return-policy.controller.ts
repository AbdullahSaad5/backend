import { returnPolicyService, ebayReturnPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const returnPolicyController = {
  createReturnPolicy: async (req: Request, res: Response) => {
    try {
      // ✅ Create policy in DB
      const returnPolicy = await returnPolicyService.createReturnPolicy(
        req.body
      );

      // ✅ Sync with eBay API
      const ebayResponse = await ebayReturnPolicyService.createReturnPolicy(
        req.body
      );

      res.status(StatusCodes.CREATED).json({
        message: "Return policy created successfully",
        returnPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Return Policy Error:", error.message);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message || "Error creating return policy" });
    }
  },

  getAllReturnPolicies: async (_req: Request, res: Response) => {
    try {
      const returnPolicies = await returnPolicyService.getAllReturnPolicies();
      const ebayPolicies = await ebayReturnPolicyService.getAllReturnPolicies(
        _req,
        res
      );
      res.status(StatusCodes.OK).json({ returnPolicies, ebayPolicies });
    } catch (error: any) {
      console.error("Get Return Policies Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching return policies" });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await returnPolicyService.getById(id);
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
      const policy = await returnPolicyService.editPolicy(id, req.body);
      const ebayResponse = await ebayReturnPolicyService.editReturnPolicy(
        id,
        req.body
      );

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
      const result = await returnPolicyService.deletePolicy(id);
      const ebayResponse = await ebayReturnPolicyService.deleteReturnPolicy(id);
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
      const result = await returnPolicyService.toggleBlock(id, isBlocked);
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

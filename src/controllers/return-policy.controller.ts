import { returnPolicyService, ebayReturnPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const returnPolicyController = {
  createReturnPolicy: async (req: Request, res: Response) => {
    try {
      console.log(
        "📩 Received request to create return policy",
        JSON.stringify(req.body, null, 2)
      );

      // ✅ Sync with eBay API first
      const ebayResponse = await ebayReturnPolicyService.createReturnPolicy(
        req.body
      );

      if (!ebayResponse || !ebayResponse.policyId) {
        console.error(
          "❌ eBay failed to create return policy. Aborting DB save.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to create return policy on eBay. Policy not saved in database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay return policy created successfully. Proceeding to save in DB.",
        ebayResponse.policyId
      );

      // ✅ Create policy in DB only if eBay creation was successful
      const returnPolicy = await returnPolicyService.createReturnPolicy({
        ...req.body,
        ebayPolicyId: ebayResponse.policyId,
      });

      res.status(StatusCodes.CREATED).json({
        message: "Return policy created successfully on both eBay and database",
        returnPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Return Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error,
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating return policy",
        error: error.message,
      });
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

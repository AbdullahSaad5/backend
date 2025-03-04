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
      console.log(
        "📩 Received request to edit return policy",
        id,
        JSON.stringify(req.body, null, 2)
      );

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await returnPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Return policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;
      console.log("🔄 Syncing update with eBay for Policy ID:", ebayPolicyId);

      // ✅ Sync update with eBay API first
      const ebayResponse = await ebayReturnPolicyService.editReturnPolicy(
        ebayPolicyId,
        req.body
      );

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to update return policy. Aborting DB update.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to update return policy on eBay. Policy not updated in database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay return policy updated successfully. Proceeding to update in DB."
      );

      // ✅ Update policy in DB only if eBay update was successful
      const policy = await returnPolicyService.editPolicy(id, req.body);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy updated successfully on both eBay and database",
        data: policy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Return Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error,
      });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating return policy",
        error: error.message,
      });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log("📩 Received request to delete return policy", id);

      // ✅ Retrieve stored policy to get the correct eBay Policy ID
      const storedPolicy = await returnPolicyService.getById(id);
      if (!storedPolicy || !storedPolicy.ebayPolicyId) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: "Return policy not found or missing eBay policy ID.",
        });
      }

      const ebayPolicyId = storedPolicy.ebayPolicyId;

      // ✅ Sync delete with eBay API first
      const ebayResponse =
        await ebayReturnPolicyService.deleteReturnPolicy(ebayPolicyId);

      if (!ebayResponse || (ebayResponse as any).errors) {
        console.error(
          "❌ eBay failed to delete return policy. Aborting DB delete.",
          ebayResponse
        );
        return res.status(StatusCodes.BAD_REQUEST).json({
          message:
            "Failed to delete return policy on eBay. Policy not deleted from database.",
          ebayResponse,
        });
      }

      console.log(
        "✅ eBay return policy deleted successfully. Proceeding to delete in DB."
      );

      await returnPolicyService.deletePolicy(id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy deleted successfully from both eBay and database",
      });
    } catch (error: any) {
      console.error("❌ Delete Return Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting return policy",
        error: error.message,
      });
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

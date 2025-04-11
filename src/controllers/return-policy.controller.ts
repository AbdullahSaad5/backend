import { ebayReturnPolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const returnPolicyController = {
  createReturnPolicy: async (req: Request, res: Response) => {
    try {
      console.log("📩 Creating eBay return policy:", JSON.stringify(req.body, null, 2));

      const ebayResponse = await ebayReturnPolicyService.createReturnPolicy(req.body);

      if (ebayResponse.error) {
        return res.status(ebayResponse.status || 400).json({
          message: "eBay returned an error",
          errors: ebayResponse.errors || [],
        });
      }

      res.status(StatusCodes.CREATED).json({
        message: "eBay return policy created successfully",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Return Policy Error:", {
        message: error.message,
        errorStack: error.stack,
        bodySent: req.body,
      });

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating return policy on eBay",
        error: error.message,
      });
    }
  },

  getAllReturnPolicies: async (_req: Request, res: Response) => {
    try {
      const ebayPolicies = await ebayReturnPolicyService.getAllReturnPolicies(_req, res);
      res.status(StatusCodes.OK).json({ ebayPolicies });
    } catch (error: any) {
      console.error("❌ Get Return Policies Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error fetching return policies from eBay",
        error: error.message,
      });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params; // ✅ Fix: use "id" not "returnPolicyId"
      console.log("📩 Getting eBay return policy:", req.params);

      const ebayPolicy = await ebayReturnPolicyService.getById(id);

      if (!ebayPolicy || (ebayPolicy as any).errors) {
        return res.status(404).json({ message: "Policy not found on eBay" });
      }

      res.status(StatusCodes.OK).json({ success: true, data: ebayPolicy });
    } catch (error: any) {
      console.error("❌ Error getting eBay policy:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching eBay policy",
        error: error.message,
      });
    }
  },

  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayResponse = await ebayReturnPolicyService.editReturnPolicy(id, req.body);

      if (!ebayResponse || (ebayResponse as any).errors) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to update return policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        message: "eBay return policy updated successfully",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Return Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error updating return policy on eBay",
        error: error.message,
      });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayResponse = await ebayReturnPolicyService.deleteReturnPolicy(id);

      if (!ebayResponse || (ebayResponse as any).errors) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to delete return policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        message: "eBay return policy deleted successfully",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Delete Return Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error deleting return policy on eBay",
        error: error.message,
      });
    }
  },
};
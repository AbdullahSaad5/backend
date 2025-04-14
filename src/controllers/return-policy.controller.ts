import { ebayReturnPolicyService } from "@/services";
import { Request, Response } from "express";
import { RequestError } from "google-auth-library/build/src/transporters";
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
      const ebayPolicies = await ebayReturnPolicyService.getAllReturnPolicies();

      if (ebayPolicies.error) {
        return res.status(ebayPolicies.status || 500).json({
          message: "Failed to fetch return policies from eBay",
          errors: ebayPolicies.errors || [],
        });
      }

      res.status(200).json({ ebayPolicies });
    } catch (error: any) {
      res.status(500).json({ message: "Unexpected error", error: error.message });
    }
  },
  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayPolicy = await ebayReturnPolicyService.getById(id);

      if (ebayPolicy.error) {
        return res.status(ebayPolicy.status || 404).json({
          message: "Failed to get return policy from eBay",
          errors: ebayPolicy.errors || [],
        });
      }

      res.status(200).json({ success: true, data: ebayPolicy });
    } catch (error: any) {
      res.status(500).json({ message: "Unexpected error", error: error.message });
    }
  },
  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayResponse = await ebayReturnPolicyService.editReturnPolicy(id, req.body);

      if (ebayResponse.error) {
        return res.status(ebayResponse.status || 400).json({
          message: "Failed to update policy on eBay",
          errors: ebayResponse.errors || [],
        });
      }

      res.status(200).json({ message: "Policy updated", ebayResponse });
    } catch (error: any) {
      res.status(500).json({ message: "Unexpected error", error: error.message });
    }
  },
  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayResponse = await ebayReturnPolicyService.deleteReturnPolicy(id);

      if (ebayResponse.error) {
        return res.status(ebayResponse.status || 400).json({
          message: "Failed to delete return policy on eBay",
          errors: ebayResponse.errors || [],
        });
      }

      res.status(200).json({ message: "Policy deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Unexpected error", error: error.message });
    }
  },
};

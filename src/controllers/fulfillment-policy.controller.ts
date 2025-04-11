import { ebayFulfillmentPolicyService } from "@/services";
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

      // ✅ Create the policy on eBay
      const ebayResponse = await ebayFulfillmentPolicyService.createEbayFulfillmentPolicy(req.body);

      console.log("🔍 eBay Fulfillment Policy Response:", JSON.stringify(ebayResponse, null, 2));

      if (!ebayResponse?.fulfillmentPolicy?.fulfillmentPolicyId) {
        console.error("❌ eBay failed to create fulfillment policy.", {
          ebayResponse,
        });
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to create fulfillment policy on eBay.",
          ebayResponse,
        });
      }

      return res.status(StatusCodes.CREATED).json({
        message: "Fulfillment policy created successfully on eBay",
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Create Fulfillment Policy Error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Error creating fulfillment policy on eBay",
        error: error.message,
      });
    }
  },

  getAllFulfillmentPolicies: async (_req: Request, res: Response) => {
    try {
      const ebayPolicies = await ebayFulfillmentPolicyService.getAllFulfillmentPolicies(_req, res);
      res.status(StatusCodes.OK).json({ ebayPolicies });
    } catch (error: any) {
      console.error("❌ Get Fulfillment Policies Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching fulfillment policies from eBay" });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ebayPolicy = await ebayFulfillmentPolicyService.getFulfillmentPolicyById(id);

      if (!ebayPolicy) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: "Policy not found on eBay" });
      }

      res.status(StatusCodes.OK).json({ success: true, data: ebayPolicy });
    } catch (error) {
      console.error("❌ View Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error getting policy from eBay" });
    }
  },
  getRateTables: async (req: Request, res: Response) => {
    try {
      const marketplaceId = req.query.marketplaceId || "EBAY_US"; // Default to UK
      const rateTables = await ebayFulfillmentPolicyService.getRateTables(marketplaceId as string);

      res.status(200).json({
        success: true,
        message: "Rate tables fetched successfully",
        data: rateTables,
      });
    } catch (error: any) {
      console.error("❌ Error in getRateTables:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch rate tables",
        error: error.message,
      });
    }
  },
  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log("📩 Received request to edit fulfillment policy", id, JSON.stringify(req.body, null, 2));

      // ✅ Update policy on eBay
      const ebayResponse = await ebayFulfillmentPolicyService.editFulfillmentPolicy(id, req.body);

      if (!ebayResponse || ebayResponse.errors) {
        console.error("❌ eBay failed to update fulfillment policy.", ebayResponse);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to update fulfillment policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy updated successfully on eBay",
        data: ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Edit Fulfillment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating fulfillment policy on eBay",
        error: error.message,
      });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log("📩 Received request to delete fulfillment policy", id);

      // ✅ Delete policy on eBay
      const ebayResponse: any = await ebayFulfillmentPolicyService.deleteFulfillmentPolicy(id);

      if (!ebayResponse || ebayResponse.errors) {
        console.error("❌ eBay failed to delete fulfillment policy.", ebayResponse);
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Failed to delete fulfillment policy on eBay.",
          ebayResponse,
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Policy deleted successfully from eBay",
      });
    } catch (error: any) {
      console.error("❌ Delete Fulfillment Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting fulfillment policy from eBay",
        error: error.message,
      });
    }
  },
};

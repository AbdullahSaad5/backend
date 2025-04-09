import { Request, Response } from "express";
import { ebayCustomPolicyService } from "@/services";

export const customPolicyController = {
  // Fetch all policies from eBay
  getAll: async (req: Request, res: Response) => {
    try {
      // Fetch policies from eBay
      const ebayPoliciesResponse = await ebayCustomPolicyService.getAllCustomPolicies();

      // Check if response is valid
      if (!ebayPoliciesResponse || !ebayPoliciesResponse.data) {
        throw new Error("Failed to fetch eBay policies");
      }

      // Return eBay policies
      res.status(200).json({ ebayPolicies: ebayPoliciesResponse.data.customPolicies });
    } catch (error: any) {
      console.error("❌ Error fetching eBay policies:", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  // Fetch a specific policy by ID from eBay
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Fetch policy by ID from eBay
      const ebayPolicyResponse = await ebayCustomPolicyService.getCustomPolicyById(id);

      if (!ebayPolicyResponse || !ebayPolicyResponse.data) {
        return res.status(404).json({ error: "Policy not found on eBay" });
      }

      res.status(200).json(ebayPolicyResponse.data);
    } catch (error: any) {
      console.error("❌ Error fetching eBay policy by ID:", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  // Create a new policy on eBay
  create: async (req: Request, res: Response) => {
    try {
      const policyData = req.body;

      // Create policy on eBay
      const ebayResponse = await ebayCustomPolicyService.createCustomPolicy(policyData);

      if (!ebayResponse || !ebayResponse.data) {
        throw new Error("Failed to create policy on eBay");
      }

      res.status(201).json({
        message: "Policy created successfully on eBay",
        ebayResponse: ebayResponse.data,
      });
    } catch (error: any) {
      console.error("❌ Error creating policy on eBay:", error);
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  // Update a policy on eBay
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Update policy on eBay
      const ebayResponse = await ebayCustomPolicyService.updateCustomPolicy(id, updateData);

      if (!ebayResponse || !ebayResponse.data) {
        throw new Error("No data returned from eBay");
      }

      // If eBay returns a 409, treat it as a conflict (already exists)
      if (ebayResponse.status === 409) {
        return res.status(409).json({
          message: "The policy already exists on eBay.",
          ebayResponse: ebayResponse.data,
        });
      }

      res.status(200).json({
        message: "Policy updated successfully on eBay",
        ebayResponse: ebayResponse.data,
      });
    } catch (error: any) {
      console.error("❌ Error updating policy on eBay:", error);

      // Handle eBay errors (e.g., from ebayResponse)
      if (error?.data?.errors) {
        // eBay returns an array of errors
        const ebayErrorMessages = error.data.errors.map((err: any) => err.message).join(", ");
        return res.status(error.status || 500).json({
          error: ebayErrorMessages || error.message || "Error updating policy on eBay",
        });
      }

      // If there's no specific eBay error, return a general message
      res.status(error.status || 500).json({
        error: error.message || "Error updating policy on eBay",
      });
    }
  },

  // Delete a policy on eBay , currently as there is no delete request in ebay API
  // delete: async (req: Request, res: Response) => {
  //   try {
  //     const { id } = req.params;

  //     // Delete policy on eBay
  //     const ebayResponse = await ebayCustomPolicyService.deleteCustomPolicy(id);

  //     if (!ebayResponse || ebayResponse.status !== "success") {
  //       throw new Error("Failed to delete policy on eBay");
  //     }

  //     res.status(200).json({
  //       message: "Policy deleted successfully from eBay",
  //     });
  //   } catch (error: any) {
  //     console.error("❌ Error deleting policy on eBay:", error);
  //     res.status(error.status || 500).json({ error: error.message });
  //   }
  // },
};

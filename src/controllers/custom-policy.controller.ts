import { Request, Response } from "express";
import { ebayCustomPolicyService } from "@/services";
import { customPolicyService } from "@/services/custom-policy.service";

export const customPolicyController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const [dbPolicies, ebayPolicies] = await Promise.all([
        customPolicyService.getAllCustomPolicies(),
        ebayCustomPolicyService.getAllCustomPolicies(),
      ]);
      res.status(200).json({ dbPolicies, ebayPolicies });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await customPolicyService.getCustomPolicyById(id);
      if (!policy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.status(200).json(policy);
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const policyData = req.body;

      // Create policy in DB
      const dbPolicy = await customPolicyService.createCustomPolicy(policyData);

      // Create policy on eBay
      const ebayResponse =
        await ebayCustomPolicyService.createCustomPolicy(policyData);

      res.status(201).json({
        message: "Policy created successfully in both DB and eBay",
        dbPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params; // Local DB policy ID
      const updateData = req.body;

      // 1️⃣ Retrieve existing policy from DB
      const existingPolicy = await customPolicyService.getCustomPolicyById(id);
      if (!existingPolicy) {
        return res.status(404).json({ error: "Policy not found in database" });
      }

      // 2️⃣ Extract the eBay Policy ID from the DB policy
      const ebayPolicyId = existingPolicy.ebayPolicyId; // Ensure this field exists in your DB schema
      if (!ebayPolicyId) {
        return res
          .status(400)
          .json({ error: "eBay policy ID not found for this policy" });
      }

      // 3️⃣ Update policy in MongoDB
      const updatedPolicy = await customPolicyService.updateCustomPolicy(
        id,
        updateData
      );
      if (!updatedPolicy) {
        return res
          .status(404)
          .json({ error: "Policy update failed in database" });
      }

      // 4️⃣ Update policy on eBay using the correct eBay policy ID
      const ebayResponse = await ebayCustomPolicyService.updateCustomPolicy(
        ebayPolicyId,
        updateData
      );

      // 5️⃣ Send response back
      res.status(200).json({
        message: "Policy updated successfully in both DB and eBay",
        updatedPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("Error updating policy:", error);
      res
        .status(error.status || 500)
        .json({ error: error.message || "Internal Server Error" });
    }
  },
};

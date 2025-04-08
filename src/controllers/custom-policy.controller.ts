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

      // Create policy on eBay
      const ebayResponse =
        await ebayCustomPolicyService.createCustomPolicy(policyData);

      if (!ebayResponse) {
        throw new Error("Failed to get eBay policy ID");
      }

      // Create policy in DB and store the eBay policy ID
      const dbPolicy = await customPolicyService.createCustomPolicy({
        ...policyData,
        ebayPolicyId: ebayResponse.customPolicyId, // ✅ Save eBay ID
      });

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
      const { id } = req.params;
      const updateData = req.body;

      // 1️⃣ Retrieve existing policy from DB
      const existingPolicy = await customPolicyService.getCustomPolicyById(id);
      if (!existingPolicy) {
        return res.status(404).json({ error: "Policy not found in database" });
      }

      // 2️⃣ Extract eBay Policy ID
      let ebayPolicyId: any = existingPolicy.ebayPolicyId;
      if (!ebayPolicyId) {
        console.warn("⚠️ eBay policy ID missing, attempting to find matching policy...");
        const ebayPoliciesResponse = await ebayCustomPolicyService.getAllCustomPolicies();
        const ebayPolicies = ebayPoliciesResponse.data.customPolicies || [];
        const matchedPolicy = ebayPolicies.find(
          (policy: any) => policy.name === existingPolicy.name
        );
        if (matchedPolicy) {
          ebayPolicyId = matchedPolicy.customPolicyId;
          console.log(`✅ Matched eBay policy: ${ebayPolicyId}`);
        } else {
          return res.status(400).json({
            error: "eBay policy ID not found and no matching policy found on eBay",
          });
        }
      }

      // 3️⃣ Update policy in MongoDB
      const updatedPolicy = await customPolicyService.updateCustomPolicy(id, updateData);
      if (!updatedPolicy) {
        return res.status(404).json({ error: "Policy update failed in database" });
      }

      // 4️⃣ Prepare clean data for eBay (REMOVE policyType if it's causing issues)
      const ebayUpdateData: any = {
        name: updateData.name || existingPolicy.name,
        label: updateData.label || existingPolicy.label,
        description: updateData.description || existingPolicy.description,
      };

      console.log("🟡 Sending update request to eBay with cleaned data:", JSON.stringify(ebayUpdateData, null, 2));

      // 5️⃣ Update policy on eBay
      const ebayResponse = await ebayCustomPolicyService.updateCustomPolicy(ebayPolicyId, ebayUpdateData);

      // 6️⃣ Send success response
      res.status(200).json({
        message: "Policy updated successfully in both DB and eBay",
        updatedPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      console.error("❌ Error updating eBay custom policy:", JSON.stringify(error, null, 2));
      res.status(error.status || 500).json({
        error: error.data || "Internal Server Error",
      });
    }
  }

};

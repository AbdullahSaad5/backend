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
      const { id } = req.params;
      const updateData = req.body;

      // Update policy in DB
      const updatedPolicy = await customPolicyService.updateCustomPolicy(
        id,
        updateData
      );
      if (!updatedPolicy) {
        return res.status(404).json({ error: "Policy not found" });
      }

      // Update policy on eBay
      const ebayResponse = await ebayCustomPolicyService.updateCustomPolicy(
        id,
        updateData
      );

      res.status(200).json({
        message: "Policy updated successfully in both DB and eBay",
        updatedPolicy,
        ebayResponse,
      });
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message });
    }
  },
};

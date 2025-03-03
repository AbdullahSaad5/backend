import { customPolicyService } from "@/services/custom-policy.service";
import { Request, Response } from "express";

export const paymentPolicyController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const policies = await customPolicyService.getAllCustomPolicies();
      res.status(200).json(policies);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve custom policies" });
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
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve the policy" });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPolicy = await customPolicyService.updateCustomPolicy(
        id,
        updateData
      );
      if (!updatedPolicy) {
        return res.status(404).json({ error: "Policy not found" });
      }
      res.status(200).json(updatedPolicy);
    } catch (error) {
      res.status(500).json({ error: "Failed to update the policy" });
    }
  },
};

import { ICustomPolicy } from "@/contracts/custom-policy.contract";
import { CustomPolicy } from "@/models/custom-policy.model";

export const customPolicyService = {
  async getAllCustomPolicies(): Promise<ICustomPolicy[]> {
    return await CustomPolicy.find();
  },

  async getCustomPolicyById(id: string): Promise<ICustomPolicy | null> {
    return await CustomPolicy.findById(id);
  },

  async createCustomPolicy(policyData: ICustomPolicy): Promise<ICustomPolicy> {
    const existingPolicy = await CustomPolicy.findOne({
      name: policyData.name,
    });
    if (existingPolicy) {
      throw new Error("A policy with this name already exists");
    }
    return await CustomPolicy.create(policyData);
  },

  async updateCustomPolicy(
    id: string,
    updateData: Partial<ICustomPolicy>
  ): Promise<ICustomPolicy | null> {
    return await CustomPolicy.findByIdAndUpdate(id, updateData, { new: true });
  },
};

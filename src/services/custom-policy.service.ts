import { ICustomPolicy } from "@/contracts/custom-policy.contract";
import { CustomPolicy } from "@/models/custom-policy.model";

export const customPolicyService = {
  async getAllCustomPolicies(): Promise<ICustomPolicy[]> {
    return await CustomPolicy.find();
  },

  async getCustomPolicyById(id: string): Promise<ICustomPolicy | null> {
    return await CustomPolicy.findById(id);
  },

  async updateCustomPolicy(
    id: string,
    updateData: Partial<ICustomPolicy>
  ): Promise<ICustomPolicy | null> {
    return await CustomPolicy.findByIdAndUpdate(id, updateData, { new: true });
  },
};

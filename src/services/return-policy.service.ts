// Updated Service
import { ReturnPolicy } from "@/models/return-policy.model";
import { IReturnPolicy } from "@/contracts/return-policy.contract";

export const returnPolicyService = {
  createReturnPolicy: (data: IReturnPolicy) => {
    const returnPolicy = new ReturnPolicy(data);
    return returnPolicy.save();
  },

  getAllReturnPolicies: () => {
    return ReturnPolicy.find();
  },

  getById: (id: string) => {
    return ReturnPolicy.findById(id);
  },

  editPolicy: (id: string, data: Partial<IReturnPolicy>) => {
    return ReturnPolicy.findByIdAndUpdate(id, data, { new: true });
  },

  deletePolicy: (id: string) => {
    return ReturnPolicy.findByIdAndDelete(id);
  },
  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await ReturnPolicy.findByIdAndUpdate(
      id,
      { isBlocked: isBlocked },
      { new: true }
    );
    if (!updatedCategory) {
      throw new Error("Policy not found");
    }
    return updatedCategory;
  },
};

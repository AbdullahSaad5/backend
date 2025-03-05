// Updated Service
import { FulfillmentPolicy } from "@/models/fulfillment-policy.model";
import { IFulfillmentPolicy } from "@/contracts/fulfillment-policy.contract";

export const fulfillmentPolicyService = {
  createFulfillmentPolicy: (data: IFulfillmentPolicy) => {
    const fulfillmentPolicy = new FulfillmentPolicy(data);
    return fulfillmentPolicy.save();
  },

  getAllFulfillmentPolicies: () => {
    return FulfillmentPolicy.find();
  },

  getById: (id: string) => {
    return FulfillmentPolicy.findById(id);
  },

  editPolicy: (id: string, data: Partial<IFulfillmentPolicy>) => {
    return FulfillmentPolicy.findByIdAndUpdate(id, data, { new: true });
  },

  deletePolicy: (id: string) => {
    return FulfillmentPolicy.findByIdAndDelete(id);
  },
  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await FulfillmentPolicy.findByIdAndUpdate(
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

// Updated Service
import { PaymentPolicy } from "@/models";
import { IPaymentPolicy } from "@/contracts/payment-policy.contract";

export const paymentPolicyService = {
  createPaymentPolicy: (data: IPaymentPolicy) => {
    const paymentPolicy = new PaymentPolicy(data);
    return paymentPolicy.save();
  },

  getAllPaymentPolicies: () => {
    return PaymentPolicy.find();
  },

  getById: (id: string) => {
    return PaymentPolicy.findById(id);
  },

  editPolicy: (id: string, data: Partial<IPaymentPolicy>) => {
    return PaymentPolicy.findByIdAndUpdate(id, data, { new: true });
  },

  deletePolicy: (id: string) => {
    return PaymentPolicy.findByIdAndDelete(id);
  },
  toggleBlock: async (id: string, isBlocked: boolean) => {
    const updatedCategory = await PaymentPolicy.findByIdAndUpdate(
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

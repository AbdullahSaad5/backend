import { PostagePolicy } from "@/models";

export const postagePolicyService = {
  createPostagePolicy: (data: any) => {
    const { policyName, policyDescription, immediatePayment, cashOnPickUp } = data;
    const postagePolicy = new PostagePolicy({
      policyName,
      policyDescription,
      immediatePayment,
      cashOnPickUp,
    });
    return postagePolicy.save();
  },

  getAllPostagePolicies: () => {
    return PostagePolicy.find();
  },

  getById: (id: string) => {
    return PostagePolicy.findById(id);
  },

  editPolicy: (id: string, data: any) => {
    return PostagePolicy.findByIdAndUpdate(id, data, { new: true });
  },

  deletePolicy: (id: string) => {
    const policy = PostagePolicy.findByIdAndDelete(id);
    if (!policy) {
      throw new Error("policy not found");
    }
    return policy;
  },
};

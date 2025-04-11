import { FaqsPolicy } from "@/models";

export const faqsPolicyService = {
    createFaqsPolicy: (data: {faqsQuestion: string , faqsAnswer: string  , faqsCategory: string }) => {
        const {faqsQuestion , faqsAnswer , faqsCategory} = data
        const faqsPolicy = new FaqsPolicy({
          faqsQuestion,
          faqsAnswer,
          faqsCategory,
        });
        return faqsPolicy.save();
},

   getAllFaqsPolicies: () => {
    return FaqsPolicy.find();
  },

   editFaqs: (
      id: string,
      data: { faqsQuestion?: string; faqsAnswer?: string; faqsCategory: string; }
    ) => {
      return FaqsPolicy.findByIdAndUpdate(id, data, { new: true });
    },

  deleteFaqs: (id: string) => {
      const faqs = FaqsPolicy.findByIdAndDelete(id);
      if (!faqs) {
        throw new Error("faqs not found");
      }
      return faqs;
    },
};
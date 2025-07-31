import { NewsletterModel } from "@/models/newsletter.model";

export const NewsletterService = {
  subscribe: (email: string) => {
    const newSubscription = new NewsletterModel({ email });
    return newSubscription.save();
  },

  updateSubscription: (
    id: string,
    data: {
      email?: string;
      isBlocked?: boolean;
    }
  ) => {
    return NewsletterModel.findByIdAndUpdate(id, data, { new: true });
  },

  unsubscribe: (id: string) => {
    return NewsletterModel.findByIdAndDelete(id);
  },

  getAllSubscriptions: (isBlocked?: boolean) => {
    const filter: { isBlocked?: boolean } = {};
    if (isBlocked !== undefined) filter.isBlocked = isBlocked;
    return NewsletterModel.find(filter);
  },

  getSubscriptionById: (id: string) => {
    return NewsletterModel.findById(id);
  },

  getSubscriptionByEmail: (email: string) => {
    return NewsletterModel.findOne({ email });
  },
};

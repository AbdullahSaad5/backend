import { ProductCategory } from "@/models";

export const websiteService = {
  getFeaturedCategoriesForWebsite: () => {
    return ProductCategory.find({
      isFeatured: true,
      isBlocked: false,
    }).select("name description image tags isPart isFeatured");
  },
};

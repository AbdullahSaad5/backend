import { websiteController } from "@/controllers";
import { Router } from "express";

export const website = (router: Router) => {
  // Fetch featured categories for website
  router.get("/featured-categories", websiteController.getFeaturedCategoriesForWebsite);

  
};

import { listingController, websiteController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";

export const website = (router: Router) => {
  // Fetch featured categories for website
  router.get("/featured-categories", websiteController.getFeaturedCategoriesForWebsite);

  // Fetch all Website listings
  router.get("/allListings", websiteController.getWebsiteListings);

  // Fetch single Website product by ID
  router.get("/listing/:id", websiteController.getWebsiteProductById);

  // router.patch("/isfeatured/:id", listingController.toggleIsFeatured);
};

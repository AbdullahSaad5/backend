import { listingController, websiteController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";

export const website = (router: Router) => {
  // Fetch featured categories for website
  router.get("/featured-categories", websiteController.getFeaturedCategoriesForWebsite);

  // website routes
  // Fetch all Website listings
  router.get("/website", listingController.getWebsiteListings);

  // Fetch single Website product by ID
  router.get("/website/:id", listingValidation.validateId, listingController.getWebsiteProductById);
  router.patch("/isfeatured/:id", listingController.toggleIsFeatured);
};

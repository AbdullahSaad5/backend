import { listingController, websiteController } from "@/controllers";
import { listingValidation } from "@/validations";
import { Router } from "express";

export const website = (router: Router) => {
  // Fetch featured categories for website
  router.get("/featured-categories", websiteController.getFeaturedCategoriesForWebsite);

  // Fetch featured listings grouped by category for website
  router.get("/featured-listings", websiteController.getFeaturedListingsForWebsite);
  router.get("/deals/active", websiteController.getActiveDeals); //deals

  // Fetch featured listings for a specific category
  router.get("/:categoryId/featured-listings", websiteController.getFeaturedListingsByCategoryId);

  // Fetch all Website listings with query parameters (GET for SEO-friendly filtering)
  router.get("/allListings", websiteController.getWebsiteListings);

  // Get available filters for a specific category
  router.get("/filters/:categoryId", websiteController.getCategoryFilters);

  // Get all available filters across categories
  router.get("/filters", websiteController.getAllAvailableFilters);

  // Fetch single Website product by ID
  router.get("/listing/:id", websiteController.getWebsiteProductById);

  // router.patch("/isfeatured/:id", listingController.toggleIsFeatured);
};

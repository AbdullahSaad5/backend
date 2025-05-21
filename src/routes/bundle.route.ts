import { bundleController } from "@/controllers"; // Assuming you have a bundle controller
import { authGuard } from "@/guards";
import { Router } from "express";
import { auth } from "firebase-admin";

export const bundle = (router: Router) => {
  // router.use(authGuard.isAuth);
  // Route to create a new bundle
  router.post("/", bundleController.addBundle);

  // Route to get all bundles
  router.get("/", bundleController.getAllBundles);
  router.get("/published", bundleController.getAllPublishedBundles);

  // Route to get a specific bundle by ID
  router.get("/:id", bundleController.getBundleById);

  // Route to update a bundle by ID
  router.patch("/:id", bundleController.updateBundleById);

  // Route to delete a bundle by ID
  router.delete("/:id", bundleController.deleteBundleById);
};

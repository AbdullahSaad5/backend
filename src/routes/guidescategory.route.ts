import { Router } from "express";
import { GuidesCategoryController } from "@/controllers/guidescategory.controller";

export const guidescategory = (router: Router) => {
  router.post("/", GuidesCategoryController.createGuidesCategory);
  router.get("/", GuidesCategoryController.getAllGuidesCategories);
  router.patch("/:id", GuidesCategoryController.updateGuidesCategory);
  router.patch("/block/:id", GuidesCategoryController.updateGuidesCategory); // You'll need to add this method
  router.delete("/:id", GuidesCategoryController.deleteGuidesCategory);
  router.get("/:id", GuidesCategoryController.getGuidesCategoryById);
};
// src/routes/faqcategory.route.ts
import { Router } from "express";
import { FaqCategoryController } from "@/controllers/faqcategory.controller";

export const faqcategory = (router: Router) => {
  router.post(
    "/",
    FaqCategoryController.createFaqCategory
  );

  router.get("/", FaqCategoryController.getAllFaqCategories);

  router.patch(
    "/:id",
    FaqCategoryController.updateFaqCategory
  );

  router.patch(
    "/block/:id",
    FaqCategoryController.updateFaqCategory
  );

  router.delete(
    "/:id",
    FaqCategoryController.deleteFaqCategory
  );

  router.get(
    "/:id",
    FaqCategoryController.getFaqCategoryById
  );
};
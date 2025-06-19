
import { Router } from "express";
import { FaqController } from "@/controllers/faq.controller";

export const faq = (router: Router) => {
  router.post("/", FaqController.createFaq);
  router.get("/", FaqController.getAllFaqs);
  router.get("/category/:category", FaqController.getFaqsByCategory);
  router.get("/:id", FaqController.getFaqById);
  router.patch("/:id", FaqController.updateFaq);
  router.patch("/block/:id", FaqController.updateFaq);
  router.delete("/:id", FaqController.deleteFaq);
};
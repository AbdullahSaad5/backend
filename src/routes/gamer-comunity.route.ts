import { gamercomunityController } from "@/controllers/gamer-comunity.controller";
import { Router } from "express";
import { blogCategoryValidation } from "@/validations/blog-category.validation";

export const gamerComunity = (router: Router) => {
  router.post(
    "/",
    // blogCategoryValidation.addCategory,
    gamercomunityController.addgamercomunity
  );

  router.get("/", gamercomunityController.getAllgamercomunity);

  router.patch(
    "/:id",
    // blogCategoryValidation.editCategory,
    gamercomunityController.editgamercomunity
  );

  router.delete(
    "/:id",
    // blogCategoryValidation.validateId,
    gamercomunityController.deletegamercomunity
  );

  router.get(
    "/:id",
    // blogCategoryValidation.validateId,
    gamercomunityController.getSpecificgamercomunity
  );

};

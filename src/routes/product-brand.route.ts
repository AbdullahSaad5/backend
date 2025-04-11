import { productBrandController } from "@/controllers";
import { productBrandValidation } from "@/validations";
import { Router } from "express";

export const productBrand = (router: Router) => {
  router.post("/", productBrandValidation.addBrand, productBrandController.addBrand);

  router.get("/", productBrandController.getAllBrands);

  router.get("/:id", productBrandValidation.validateId, productBrandController.getSpecificBrand);

  router.patch("/:id", productBrandValidation.updateBrand, productBrandController.editBrand);

  router.delete("/:id", productBrandValidation.validateId, productBrandController.deleteBrand);

  router.patch("/block/:id", productBrandValidation.validateId, productBrandController.toggleBlock);
};


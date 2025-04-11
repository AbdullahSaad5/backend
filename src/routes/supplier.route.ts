import { Router } from "express";
import { supplierController } from "@/controllers";
import { supplierValidation } from "@/validations";

export const supplier = (router: Router) => {
  // route for create new supplier
  router.post(
    "/",
    supplierValidation.addSupplier,
    supplierController.addSupplier
  );
  router.get("/stats", supplierController.getSupplierStats);
  // route for get all suppliers
  router.get("/", supplierController.getSuppliers);
  //new route for search and filter and pagination
  router.get("/search", supplierController.searchAndFilterSuppliers);
  // route for get details of specific supplier by id
  router.get(
    "/:id",
    supplierValidation.validateId,
    supplierController.getSupplierById
  );

  // route for update supplier
  // TODO: , "supplierValidation.validateId" add validation
  router.patch("/:id", supplierController.editSupplier);

  // route for delete supplier using id
  router.delete(
    "/:id",
    supplierValidation.validateId,
    supplierController.deleteSupplier
  );

  // route for toggle block status
  router.patch("/block/:id", supplierController.toggleBlock);
};

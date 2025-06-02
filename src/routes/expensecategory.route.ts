import { Router } from "express";
import { ExpenseCategoryController } from "@/controllers/expensecategory.controller";

export const expensecategory = (router: Router) => {
  router.post(
    "/",
    // complaintsValidation.addcomplaints,
    ExpenseCategoryController.createExpenseCategory
  );

  router.get("/", ExpenseCategoryController.getAllExpenseCategories);

  router.patch(
    "/:id",
    // complaintsValidation.editcomplaints,
    ExpenseCategoryController.updateExpenseCategory
  );

  router.patch(
    "/block/:id",
    // complaintsValidation.editcomplaints,
    ExpenseCategoryController.updateExpenseCategory
  );

  router.delete(
    "/:id",
    // complaintsValidation.validateId,
    ExpenseCategoryController.deleteExpenseCategory
  );

  router.get(
    "/:id",
    // complaintsValidation.validateId,
    ExpenseCategoryController.getExpenseCategoryById
  );

  
};

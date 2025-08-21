import { Router } from "express";
import { RecurringExpenseController } from "@/controllers/recurring-expense.controller";

export const recurringExpense = (router: Router) => {
  router.post("/", RecurringExpenseController.create);
  router.get("/", RecurringExpenseController.getAll);
  router.get("/:id", RecurringExpenseController.getById);
  router.patch("/:id", RecurringExpenseController.update);
  router.delete("/:id", RecurringExpenseController.remove);
  router.patch("/block/:id" , RecurringExpenseController.toggleBlock)
  

  // Optional: manual trigger for processing due items instead of wait for cron
  router.post("/process/now", RecurringExpenseController.triggerProcess);
};

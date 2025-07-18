import express, { Router } from "express";
import { expenseController } from "../controllers/expense.controller";

const router = express.Router();

export const expense = (router: Router) => {
  router.post("/", expenseController.createExpense);

  // Get single expense
  router.get("/:id", expenseController.getExpense);

  // Get all expenses with optional filters
  router.get("/", expenseController.getAllExpenses);

  // Update expense
  router.patch("/:id", expenseController.updateExpense);

  router.patch("/block/:id", expenseController.updateExpense);


  // Delete expense
  router.delete("/:id", expenseController.deleteExpense);

  // Get expense statistics
  router.get("/stats/summary", expenseController.getExpenseStatistics);
};
// Create expense

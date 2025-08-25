import express, { Router } from "express";
import { expenseController } from "../controllers/expense.controller";

const router = express.Router();

export const expense = (router: Router) => {
  // Create expense
  router.post("/", expenseController.createExpense);

  // Get all expenses with optional filters
  router.get("/", expenseController.getAllExpenses);
  
  // Search expenses with pagination and filters
  router.get("/search", expenseController.searchExpenses);

  // Get single expense
  router.get("/:id", expenseController.getExpense);

  // Update expense
  router.patch("/:id", expenseController.updateExpense);

  router.patch("/block/:id", expenseController.updateExpense);

  // Delete expense
  router.delete("/:id", expenseController.deleteExpense);
  
};

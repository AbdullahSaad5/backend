import { discountController } from "@/controllers"; // Assuming you have a cart controller
import { authGuard } from "@/guards"; // Importing authentication guard
import { Router } from "express"; // Express Router for routing
import { auth } from "firebase-admin"; // Firebase authentication

export const discount = (router: Router) => {
  // Optionally, add an authentication guard if needed
  // router.use(authGuard.isAuth);
  router.post("/", discountController.createOrUpdateDiscount); // Create or update discount
  router.get("/", discountController.getAllDiscounts); // Get all discounts
  router.get("/:categoryId", discountController.getDiscountByCategory); // Get discount by category
};

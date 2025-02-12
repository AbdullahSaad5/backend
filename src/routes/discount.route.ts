import { discountController } from "@/controllers"; // Assuming you have a cart controller
import { authGuard } from "@/guards"; // Importing authentication guard
import { Router } from "express"; // Express Router for routing
import { auth } from "firebase-admin"; // Firebase authentication

export const discount = (router: Router) => {
  // Optionally, add an authentication guard if needed
  // router.use(authGuard.isAuth);
  router.post("/", discountController.createDiscount);
  router.get("/", discountController.getAllDiscounts);
  router.get("/:id", discountController.getDiscountById);
  router.patch("/:id", discountController.updateDiscount);
  router.delete("/:id", discountController.deleteDiscount);
  router.post("/validate", discountController.applyDiscount);
};

import { cartController } from "@/controllers"; // Assuming you have a cart controller
import { authGuard } from "@/guards"; // Importing authentication guard
import { Router } from "express"; // Express Router for routing
import { auth } from "firebase-admin"; // Firebase authentication

export const cartRoutes = (router: Router) => {
  // Optionally, add an authentication guard if needed
  // router.use(authGuard.isAuth); 

  // Route to create a new cart
  router.post("/", cartController.createCart);

  // Route to get all carts (for admin purposes, for example)
  router.get("/", cartController.getAllCarts);

  // Route to get a specific cart by ID
  router.get("/:id", cartController.getCartById);

  // Route to add an item to the cart
  router.post("/:cartId/items", cartController.addItemToCart);

  // Route to update an item in the cart
  router.patch("/:cartId/items/:itemId", cartController.updateCartItem);

  // Route to remove an item from the cart
  router.delete("/:cartId/items/:itemId", cartController.removeItemFromCart);

  // Route to update cart status (active/abandoned)
  router.patch("/:cartId/status", cartController.updateCartStatus);

  // Route to get the pricing details of a specific cart
  router.get("/:cartId/pricing", cartController.getCartPricing);

  // Route to update the cart's pricing (e.g., after applying a discount, etc.)
  router.patch("/:cartId/pricing", cartController.updateCartPricing);

  // Route to delete a cart by ID
  router.delete("/:id", cartController.deleteCartById);
};

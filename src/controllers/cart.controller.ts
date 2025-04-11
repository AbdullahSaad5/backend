import { cartService } from "@/services"; // Importing the cart service
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes"; // For HTTP status codes

export const cartController = {
  // Create a new cart
  createCart: async (req: Request, res: Response) => {
    try {
      const cartData = req.body; // Destructure cart details from the request body
      const newCart = await cartService.createCart(cartData); // Call the service to create the cart
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Cart created successfully",
        data: newCart,
      });
    } catch (error) {
      console.error("Error creating cart:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating cart",
      });
    }
  },

  // Get all carts (Admin use case)
  getAllCarts: async (req: Request, res: Response) => {
    try {
      const carts = await cartService.getAllCarts(); // Fetch all carts from the service
      return res.status(StatusCodes.OK).json({
        success: true,
        carts,
      });
    } catch (error) {
      console.error("Error fetching all carts:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching all carts",
      });
    }
  },

  // Get a specific cart by ID
  getCartById: async (req: Request, res: Response) => {
    try {
      const cartId = req.params.id; // Get the cart ID from the request params
      const cart = await cartService.getCartById(cartId); // Fetch cart details from the service
      if (!cart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        cart,
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching cart",
      });
    }
  },

  // Add an item to the cart
  addItemToCart: async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params; // Get the cart ID from the request params
      const itemData = req.body; // Get the item details from the request body
      const updatedCart = await cartService.addItemToCart(cartId, itemData); // Call service to add item to cart
      if (!updatedCart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Item added to cart successfully",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Error adding item to cart:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error adding item to cart",
      });
    }
  },

  // Update an item in the cart
  updateCartItem: async (req: Request, res: Response) => {
    try {
      const { cartId, itemId } = req.params; // Get cart and item ID from params
      const updateData = req.body; // Get the updated item data
      const updatedCart = await cartService.updateCartItem(
        cartId,
        itemId,
        updateData
      ); // Call service to update item
      if (!updatedCart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart or item not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Cart item updated successfully",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating cart item",
      });
    }
  },

  // Remove an item from the cart
  removeItemFromCart: async (req: Request, res: Response) => {
    try {
      const { cartId, itemId } = req.params; // Get cart and item ID from params
      const updatedCart = await cartService.removeItemFromCart(cartId, itemId); // Call service to remove item
      if (!updatedCart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart or item not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Item removed from cart successfully",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Error removing item from cart:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error removing item from cart",
      });
    }
  },

  // Update cart status (active/abandoned)
  updateCartStatus: async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params; // Get cart ID from params
      const { status } = req.body; // Get the new status (active or abandoned)
      const updatedCart = await cartService.updateCartStatus(cartId, status); // Call service to update status
      if (!updatedCart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Cart status updated successfully",
        cart: updatedCart,
      });
    } catch (error) {
      console.error("Error updating cart status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating cart status",
      });
    }
  },

  // Get cart pricing details
  getCartPricing: async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params; // Get cart ID from params
      const pricing = await cartService.getCartPricing(cartId); // Fetch pricing details
      if (!pricing) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Pricing not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        pricing,
      });
    } catch (error) {
      console.error("Error fetching cart pricing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching cart pricing",
      });
    }
  },

  // Update cart pricing (e.g., after applying discounts)
  updateCartPricing: async (req: Request, res: Response) => {
    try {
      const { cartId } = req.params; // Get cart ID from params
      const pricingData = req.body; // Get the updated pricing data
      const updatedPricing = await cartService.updateCartPricing(
        cartId,
        pricingData
      ); // Call service to update pricing
      if (!updatedPricing) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Cart pricing updated successfully",
        pricing: updatedPricing,
      });
    } catch (error) {
      console.error("Error updating cart pricing:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating cart pricing",
      });
    }
  },

  // Delete a cart by ID
  deleteCartById: async (req: Request, res: Response) => {
    try {
      const cartId = req.params.id; // Get cart ID from params
      const deletedCart = await cartService.deleteCartById(cartId); // Call service to delete the cart
      if (!deletedCart) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ message: "Cart not found" });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Cart deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting cart:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting cart",
      });
    }
  },
};

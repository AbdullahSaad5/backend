import { Cart } from "@/models/cart.model"; // Import the Cart model
import {
  ICart,
  ICartUpdatePayload,
  ICartItem,
} from "@/contracts/cart.contract"; // Import the ICart contract

export const cartService = {
  // Create a new cart
  createCart: async (cartData: ICart) => {
    try {
      const newCart = new Cart(cartData); // Create a new Cart instance
      await newCart.save(); // Save the new cart to the database
      return newCart; // Return the saved cart
    } catch (error) {
      console.error("Error creating cart:", error);
      throw new Error("Failed to create cart in the database");
    }
  },

  // Get all carts
  getAllCarts: async () => {
    try {
      return await Cart.find(); // Fetch all carts from the database
    } catch (error) {
      console.error("Error fetching carts:", error);
      throw new Error("Failed to retrieve carts from the database");
    }
  },

  // Get a cart by ID
  getCartById: async (cartId: string) => {
    try {
      const cart = await Cart.findById(cartId); // Fetch a specific cart by its ID
      if (!cart) {
        return null; // Return null if cart is not found (to handle in the controller)
      }
      return cart; // Return the found cart
    } catch (error) {
      console.error("Error fetching cart:", error);
      throw new Error("Failed to retrieve the cart");
    }
  },

  // Add an item to the cart
  addItemToCart: async (cartId: string, itemData: ICartItem) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      }
      cart.items.push(itemData); // Add item to the cart
      await cart.save(); // Save the updated cart
      return cart; // Return the updated cart
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw new Error("Failed to add item to cart");
    }
  },

  // Update an item in the cart
  updateCartItem: async (
    cartId: string,
    itemId: string,
    updateData: ICartUpdatePayload
  ) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      }
      const itemIndex = cart.items.findIndex(
        (item) => item._id.toString() === itemId
      );
      if (itemIndex === -1) {
        return null; // Return null if item not found (to handle in the controller)
      }
      //TODO:fix
      //   cart.items[itemIndex] = { ...cart.items[itemIndex], ...updateData }; // Update the item
      await cart.save(); // Save the updated cart
      return cart; // Return the updated cart
    } catch (error) {
      console.error("Error updating item in cart:", error);
      throw new Error("Failed to update item in cart");
    }
  },

  // Remove an item from the cart
  removeItemFromCart: async (cartId: string, itemId: string) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      }
      const itemIndex = cart.items.findIndex(
        (item) => item._id.toString() === itemId
      );
      if (itemIndex === -1) {
        return null; // Return null if item not found (to handle in the controller)
      }
      cart.items.splice(itemIndex, 1); // Remove the item from the cart
      await cart.save(); // Save the updated cart
      return cart; // Return the updated cart
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw new Error("Failed to remove item from cart");
    }
  },

  // Update cart status (active/abandoned)
  updateCartStatus: async (cartId: string, status: string) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      } //TODO:fix
      //   cart.status = status; // Update the cart status
      await cart.save(); // Save the updated cart
      return cart; // Return the updated cart
    } catch (error) {
      console.error("Error updating cart status:", error);
      throw new Error("Failed to update cart status");
    }
  },

  // Get cart pricing details
  getCartPricing: async (cartId: string) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      }
      const pricing = cart.items.reduce(
        //TODO:fix
        (total, item: any) => total + item?.price * item.quantity,
        0
      ); // Calculate total pricing
      return { totalPrice: pricing }; // Return total pricing
    } catch (error) {
      console.error("Error fetching cart pricing:", error);
      throw new Error("Failed to fetch cart pricing");
    }
  },

  // Update cart pricing (e.g., after applying discounts)
  updateCartPricing: async (
    cartId: string,
    pricingData: { totalPrice: number }
  ) => {
    try {
      const cart = await Cart.findById(cartId); // Find the cart by ID
      if (!cart) {
        return null; // Return null if cart not found (to handle in the controller)
      } //TODO:fix
      //   cart.totalPrice = pricingData.totalPrice; // Update the pricing with the provided data
      await cart.save(); // Save the updated cart
      return cart; // Return the updated cart
    } catch (error) {
      console.error("Error updating cart pricing:", error);
      throw new Error("Failed to update cart pricing");
    }
  },

  // Delete a cart by ID
  deleteCartById: async (cartId: string) => {
    try {
      const deletedCart = await Cart.findByIdAndDelete(cartId); // Find and delete the cart
      if (!deletedCart) {
        return null; // Return null if cart not found (to handle in the controller)
      }
      return deletedCart; // Return the deleted cart
    } catch (error) {
      console.error("Error deleting cart:", error);
      throw new Error("Failed to delete the cart");
    }
  },
};

import { Order } from "@/models/order.model"; // Import the Order model
import { IOrder, IOrderUpdatePayload } from "@/contracts/order.contract"; // Import the IOrder contract

export const orderService = {
  // Add a new order
  addOrder: async (orderData: IOrder) => {
    try {
      const newOrder = new Order(orderData); // Create a new Order instance
      await newOrder.save(); // Save the new order to the database
      return newOrder; // Return the saved order
    } catch (error) {
      console.error("Error adding order:", error);
      throw new Error("Failed to add order to the database");
    }
  },

  // Get all orders
  getAllOrders: async () => {
    try {
      return await Order.find(); // Fetch all orders from the database
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to retrieve orders from the database");
    }
  },

  // Get an order by ID
  getOrderById: async (orderId: string) => {
    try {
      const order = await Order.findById(orderId); // Fetch a specific order by its ID
      if (!order) {
        throw new Error("Order not found");
      }
      return order; // Return the found order
    } catch (error) {
      console.error("Error fetching order:", error);
      throw new Error("Failed to retrieve the order");
    }
  },

  // Update an order by ID
  updateOrderById: async (orderId: string, data: IOrderUpdatePayload) => {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(orderId, data, {
        new: true,
      }); // Update the order by ID
      if (!updatedOrder) {
        throw new Error("Order not found");
      }
      return updatedOrder; // Return the updated order
    } catch (error) {
      console.error("Error updating order:", error);
      throw new Error("Failed to update the order");
    }
  },

  // Delete an order by ID
  deleteOrderById: async (orderId: string) => {
    try {
      const deletedOrder = await Order.findByIdAndDelete(orderId); // Delete the order by ID
      if (!deletedOrder) {
        throw new Error("Order not found");
      }
      return deletedOrder; // Return the deleted order
    } catch (error) {
      console.error("Error deleting order:", error);
      throw new Error("Failed to delete the order");
    }
  },
};

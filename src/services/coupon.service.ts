import { ICoupon } from "@/contracts/coupon.contract";
import { Coupon } from "@/models"; // Import the  coupon model

export const couponService = {
  // Create a new  coupon
  createCart: async (cartData: ICoupon) => {
    try {
      const newCart = new Coupon(cartData); // Create a new  coupon instance
      await newCart.save(); // Save the new  coupon to the database
      return newCart; // Return the saved  coupon
    } catch (error) {
      console.error("Error creating  coupon:", error);
      throw new Error("Failed to create  coupon in the database");
    }
  },
};

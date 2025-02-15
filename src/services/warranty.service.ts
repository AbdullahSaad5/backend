import { Warranty } from "@/models/warranty.model";
import { IWarranty } from "@/contracts/warranty.contract";
import { Product } from "@/models/product.model"; // Import Product Model
import { User } from "@/models/user.model"; // Import User Model

export class warrantyService {
  // 📌 Add New Warranty with Validation
  static async createWarranty(data: Partial<IWarranty>) {
    // 1️⃣ Check if the product exists
    const productExists = await Product.findById(data.productId);
    if (!productExists) {
      throw new Error("Product not found. Please provide a valid productId.");
    }

    // 2️⃣ Check if the supplier exists
    const supplierExists = await User.findById(data.warrantySupplier);
    if (!supplierExists) {
      throw new Error(
        "Supplier not found. Please provide a valid warrantySupplier."
      );
    }

    // 3️⃣ Create and return the warranty
    return await Warranty.create(data);
  }

  // Get all warranties
  static async getAllWarranties() {
    return await Warranty.find().populate("productId warrantySupplier");
  }

  // Get warranty by ID
  static async getWarrantyById(id: string) {
    return await Warranty.findById(id).populate("productId warrantySupplier");
  }

  // Update a warranty (with validation)
  static async updateWarranty(id: string, data: Partial<IWarranty>) {
    // Check if warranty exists
    const warranty = await Warranty.findById(id);
    if (!warranty) {
      throw new Error("Warranty not found.");
    }

    // Validate productId if updated
    if (data.productId) {
      const productExists = await Product.findById(data.productId);
      if (!productExists) {
        throw new Error("Invalid productId. Product does not exist.");
      }
    }

    // Validate warrantySupplier if updated
    if (data.warrantySupplier) {
      const supplierExists = await User.findById(data.warrantySupplier);
      if (!supplierExists) {
        throw new Error("Invalid warrantySupplier. Supplier does not exist.");
      }
    }

    return await Warranty.findByIdAndUpdate(id, data, { new: true });
  }

  // Delete a warranty
  static async deleteWarranty(id: string) {
    return await Warranty.findByIdAndDelete(id);
  }
}

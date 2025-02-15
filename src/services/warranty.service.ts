import { Warranty } from "@/models/warranty.model";
import { IWarranty } from "@/contracts/warranty.contract";

export class warrantyService {
  // 📌 Add New Warranty Purchase Entry (Instead of Updating)
  static async createWarranty(data: Partial<IWarranty>) {
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

  // Update a warranty
  static async updateWarranty(id: string, data: Partial<IWarranty>) {
    return await Warranty.findByIdAndUpdate(id, data, { new: true });
  }

  // Delete a warranty
  static async deleteWarranty(id: string) {
    return await Warranty.findByIdAndDelete(id);
  }
}

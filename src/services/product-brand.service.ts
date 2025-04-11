import { ProductBrandUpdatePayload } from "@/contracts/product-brand.contract";
import { ProductBrand } from "@/models";

export const productBrandService = {
  createBrand: (name: string, description: string, logo: string[], isBlocked: boolean) => {
    const newBrand = new ProductBrand({ name, description, logo, isBlocked });
    return newBrand.save();
  },// new chane is here
  getAllBrands: () => {
    return ProductBrand.find();
  },

  getBrandById: (id: string) => {
    return ProductBrand.findById(id);
  },

  updateBrand: (id: string, updateData: ProductBrandUpdatePayload) => {
    return ProductBrand.findByIdAndUpdate(id, updateData, { new: true });
  },

  deleteBrand: (id: string) => {
    return ProductBrand.findByIdAndDelete(id);
  },

  toggleBlock: (id: string, isBlocked: boolean) => {
    return ProductBrand.findByIdAndUpdate(id, { isBlocked}, { new: true });
  },
};

import { ebayService, productService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { transformProductData } from "@/utils/transformProductData.util";

export const productController = {
  createDraftProduct: async (req: Request, res: Response) => {
    try {
      const { stepData } = req.body;

      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Save draft product in MongoDB
      const draftProduct = await productService.createDraftProduct(stepData);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Draft product created successfully",
        data: { productId: draftProduct._id },
      });
    } catch (error: any) {
      console.error("Error creating draft product:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error creating draft product",
      });
    }
  },

  updateDraftProduct: async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;
      const { stepData } = req.body;

      if (!mongoose.isValidObjectId(productId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'productId'",
        });
      }

      if (!stepData || typeof stepData !== "object") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid or missing 'stepData' in request payload",
        });
      }

      // Update draft product in MongoDB
      const updatedProduct = await productService.updateDraftProduct(
        productId,
        stepData
      );

      // If product is now marked for publishing, sync to eBay
      if (stepData.publishToEbay) {
        const ebayItemId =
          await ebayService.syncProductWithEbay(updatedProduct);
        await productService.updateDraftProduct(updatedProduct._id, {
          ebayItemId,
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft product updated successfully",
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error updating draft product:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating draft product",
      });
    }
  },

  getAllProduct: async (req: Request, res: Response) => {
    try {
      const products = await productService.getAllProducts();
      return res.status(StatusCodes.OK).json({
        success: true,
        products,
      });
    } catch (error: any) {
      console.error("Error fetching products:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching products",
      });
    }
  },

  getProductById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // const platform = req.query.platform as "amazon" | "ebay" | "website";

      // if (!platform) {
      //   return res.status(StatusCodes.BAD_REQUEST).json({
      //     success: false,
      //     message: "Platform query parameter is required",
      //   });
      // }

      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        product,
      });
    } catch (error: any) {
      console.error("Error fetching product by ID:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching product",
      });
    }
  },

  transformAndSendProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      // Fetch product from DB
      const product = await productService.getFullProductById(id);

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      // Transform product data using utility
      const transformedProduct = transformProductData(product);

      // Send transformed product as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Product transformed successfully",
        data: transformedProduct,
      });
    } catch (error: any) {
      console.error("Error transforming product:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming product",
      });
    }
  },
  //Get All Template Product Names
  getAllTemplateProducts: async (req: Request, res: Response) => {
    try {
      const templates = await productService.getProductsByCondition({
        isTemplate: true,
      });

      if (!templates.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No templates found",
        });
      }

      let templateList = templates.map((template, index) => {
        const productId = template._id;
        const kind = template.kind || "UNKNOWN";

        let fields: string[] = [];
        const prodInfo: any =
          template.platformDetails.website?.prodTechInfo || {};

        switch (kind.toLowerCase()) {
          case "laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "all in one pc":
            fields = [
              prodInfo.type,
              prodInfo.memory,
              prodInfo.processor,
              prodInfo.operatingSystem,
            ];
            break;
          case "projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "gaming pc":
            fields = [
              prodInfo.processor,
              prodInfo.gpu,
              prodInfo.operatingSystem,
            ];
            break;
          case "network equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";

        const srno = (index + 1).toString().padStart(2, "0");

        const templateName = `${kind}-${fieldString}-${srno}`.toUpperCase();

        return { templateName, productId };
      });

      // 🔹 Sort by the number at the end of templateName in descending order
      templateList.sort((a, b) => {
        const numA = parseInt(a.templateName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.templateName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA; // Descending order
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Templates fetched successfully",
        data: templateList,
      });
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching templates",
      });
    }
  },

  //Get All Draft Product Names
  getAllDraftProductNames: async (req: Request, res: Response) => {
    try {
      const drafts = await productService.getProductsByCondition({
        status: "draft",
      });

      if (!drafts.length) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "No draft products found",
        });
      }

      let draftList = drafts.map((draft, index) => {
        const productId = draft._id;
        const kind = draft.kind || "UNKNOWN";

        let fields: string[] = [];
        const prodInfo: any = draft.platformDetails.website?.prodTechInfo || {};

        switch (kind.toLowerCase()) {
          case "laptops":
            fields = [
              prodInfo.processor,
              prodInfo.model,
              prodInfo.ssdCapacity,
              prodInfo.hardDriveCapacity,
              prodInfo.manufacturerWarranty,
              prodInfo.operatingSystem,
            ];
            break;
          case "all in one pc":
            fields = [
              prodInfo.type,
              prodInfo.memory,
              prodInfo.processor,
              prodInfo.operatingSystem,
            ];
            break;
          case "projectors":
            fields = [prodInfo.type, prodInfo.model];
            break;
          case "monitors":
            fields = [prodInfo.screenSize, prodInfo.maxResolution];
            break;
          case "gaming pc":
            fields = [
              prodInfo.processor,
              prodInfo.gpu,
              prodInfo.operatingSystem,
            ];
            break;
          case "network equipments":
            fields = [prodInfo.networkType, prodInfo.processorType];
            break;
          default:
            fields = ["UNKNOWN"];
            break;
        }

        const fieldString = fields.filter(Boolean).join("-") || "UNKNOWN";

        const srno = (index + 1).toString().padStart(2, "0");

        const draftName = `DRAFT-${kind}-${fieldString}-${srno}`.toUpperCase();

        return { draftName, productId };
      });

      // 🔹 Sort by the number at the end of draftName in descending order
      draftList.sort((a, b) => {
        const numA = parseInt(a.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        const numB = parseInt(b.draftName.match(/(\d+)$/)?.[0] || "0", 10);
        return numB - numA; // Descending order
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Draft products names fetched successfully",
        data: draftList,
      });
    } catch (error: any) {
      console.error("Error fetching Draft names:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error fetching draft names",
      });
    }
  },

  //Selected transformed draft Product
  transformAndSendDraftProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid draft ID",
        });
      }

      // Fetch product from DB
      const product = await productService.getFullProductById(id);

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      // Transform product data using utility
      const transformedProductDraft = transformProductData(product);

      // Send transformed Draft product as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "draft transformed and Fetched successfully",
        data: transformedProductDraft,
      });
    } catch (error: any) {
      console.error("Error transforming product Draft:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming product Draft",
      });
    }
  },
  //Selected transformed Template Product
  transformAndSendTemplateProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate product ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid template ID",
        });
      }

      // Fetch product from DB
      const product = await productService.getFullProductById(id);

      if (!product) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      // Transform product data using utility
      const transformedProductTemplate = transformProductData(product);

      // Send transformed product as response
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "template transformed and Fetched successfully",
        data: transformedProductTemplate,
      });
    } catch (error: any) {
      console.error("Error transforming product Template:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error transforming product Template",
      });
    }
  },
  updateProductById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, data } = req.body;

      if (!platform || !data) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Platform and data are required to update the product",
        });
      }

      const updatedProduct = await productService.updateProduct(
        id,
        platform,
        data
      );

      if (!updatedProduct) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error updating product:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating product",
      });
    }
  },

  deleteProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await productService.deleteProduct(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Product deleted successfully",
        deletedProduct: result,
      });
    } catch (error) {
      console.error("Delete Product Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting product" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;

      if (typeof isBlocked !== "boolean") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "isBlocked must be a boolean value",
        });
      }

      const updatedProduct = await productService.toggleBlock(id, isBlocked);

      if (!updatedProduct) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Product ${isBlocked ? "blocked" : "unblocked"} successfully`,
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error("Error toggling block status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error toggling block status",
      });
    }
  },
  getProductStats: async (req: Request, res: Response) => {
    try {
      const stats = await productService.getProductStats();
      return res.status(StatusCodes.OK).json(stats);
    } catch (error) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "Error fetching products statistics" });
    }
  },
  searchAndFilterProducts: async (req: Request, res: Response) => {
    try {
      // Extract filters from query params
      const {
        searchQuery = "",
        userType,
        status, // Extract status properly
        isBlocked,
        isTemplate,
        startDate,
        endDate,
        page = "1",
        limit = "10",
      } = req.query;

      // Safe parsing and validation
      const filters = {
        searchQuery: searchQuery as string,
        userType: userType ? userType.toString() : undefined,
        status:
          status && ["draft", "published"].includes(status.toString())
            ? status.toString()
            : undefined, // Validate status
        isBlocked:
          isBlocked === "true"
            ? true
            : isBlocked === "false"
              ? false
              : undefined, // Convert only valid booleans
        isTemplate:
          isTemplate === "true"
            ? true
            : isTemplate === "false"
              ? false
              : undefined, // Convert only valid booleans
        startDate:
          startDate && !isNaN(Date.parse(startDate as string))
            ? new Date(startDate as string)
            : undefined,
        endDate:
          endDate && !isNaN(Date.parse(endDate as string))
            ? new Date(endDate as string)
            : undefined,
        page: Math.max(parseInt(page as string, 10) || 1, 1), // Ensure valid positive integer
        limit: parseInt(limit as string, 10) || 10, // Default to 10 if invalid
      };

      // Call the service to search and filter the products
      const products = await productService.searchAndFilterProducts(filters);

      // Return the results
      res.status(200).json({
        success: true,
        message: "Search and filter completed successfully",
        data: products,
      });
    } catch (error) {
      console.error("Error in search and filter:", error);
      res.status(500).json({
        success: false,
        message: "Error in search and filter products",
      });
    }
  },
  bulkUpdateProductTaxDiscount: async (req: Request, res: Response) => {
    try {
      const { productIds, discountValue, vat } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res
          .status(400)
          .json({ message: "productIds array is required" });
      }

      if (discountValue === undefined || vat === undefined) {
        return res
          .status(400)
          .json({ message: "Both discount and VAT/tax are required" });
      }

      // Validate each productId format
      for (const productId of productIds) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res
            .status(400)
            .json({ message: `Invalid productId: ${productId}` });
        }
      }

      // Perform bulk update
      const result = await productService.bulkUpdateProductTaxDiscount(
        productIds,
        discountValue,
        vat
      );

      return res.status(200).json({
        message: "Product VAT/tax and discount updated successfully",
        result,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  },
  upsertProductVariations: async (req: Request, res: Response) => {
    try {
      const product = await productService.upsertProductVariationsService(
        req.params.id,
        req.body.selectedVariations
      );
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      res
        .status(200)
        .json({ message: "Product variations updated successfully", product });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
  // Get selected variations
  getSelectedProductVariations: async (req: Request, res: Response) => {
    try {
      const product: any =
        await productService.getSelectedProductVariationsService(req.params.id);
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      res.status(200).json({ selectedVariations: product.selectedVariations });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};

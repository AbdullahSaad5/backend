import { Product } from "@/models";
import mongoose, { Types } from "mongoose";
export const productService = {
  // Create a new draft product
  createDraftProduct: async (stepData: any) => {
    try {
      const productCategory =
        stepData.productCategory &&
        mongoose.isValidObjectId(stepData.productCategory)
          ? new mongoose.Types.ObjectId(stepData.productCategory)
          : null;
      const productSupplier =
        stepData.productSupplier &&
        mongoose.isValidObjectId(stepData.productSupplier)
          ? new mongoose.Types.ObjectId(stepData.productSupplier)
          : null;
      if (!productCategory) {
        throw new Error("Invalid or missing 'productCategory'");
      }
      if (!productSupplier) {
        throw new Error("Invalid or missing 'productSupplier'");
      }

      const draftProduct: any = new Product({
        platformDetails: {
          amazon: {
            productInfo: {
              productCategory: null,
              productSupplier: null,
              title: "",
              productDescription: "",
              brand: "",
              images: [],
            },
          },
          ebay: {
            productInfo: {
              productCategory: null,
              productSupplier: null,

              title: "",
              productDescription: "",
              brand: "",
              images: [],
            },
          },
          website: {
            productInfo: {
              productCategory: null,
              productSupplier: null,
              title: "",
              productDescription: "",
              brand: "",
              images: [],
            },
          },
        },
        status: "draft",
        isBlocked: false,
      });

      Object.entries(stepData).forEach(([key, value]: [string, any]) => {
        const { value: fieldValue, isAmz, isEbay, isWeb } = value || {};
        if (isAmz)
          draftProduct.platformDetails.amazon.productInfo[key] = fieldValue;
        if (isEbay)
          draftProduct.platformDetails.ebay.productInfo[key] = fieldValue;
        if (isWeb)
          draftProduct.platformDetails.website.productInfo[key] = fieldValue;
      });

      ["amazon", "ebay", "website"].forEach((platform) => {
        draftProduct.platformDetails[platform].productInfo.productCategory =
          productCategory;
        draftProduct.platformDetails[platform].productInfo.productSupplier =
          productSupplier;
        draftProduct.kind = stepData.kind;
      });

      await draftProduct.save();
      return draftProduct;
    } catch (error) {
      console.error("Error creating draft product:", error);
      throw new Error("Failed to create draft product");
    }
  },

  // Update an existing draft product when user move to next stepper
  updateDraftProduct: async (productId: string, stepData: any) => {
    try {
      // Fetch the existing draft product
      const draftProduct: any = await Product.findById(productId);
      if (!draftProduct) {
        throw new Error("Draft product not found");
      }
      // console.log("draftProduct in updateDraftProduct service : ", draftProduct);
      // console.log("stepDataaa in updateDraftProduct service : ", stepData);

      // this code will run only on final call (final stepper)
      if (stepData.status) {
        draftProduct.status = stepData.status; // Corrected to assignment
        draftProduct.isTemplate = stepData.isTemplate;
        await draftProduct.save(); // Assuming save is an async function
        return draftProduct;
      }

      // Helper function to process step data recursively
      const processStepData = (
        data: any,
        platformDetails: any,
        keyPrefix: string = "",
        inheritedFlags: {
          isAmz?: boolean;
          isEbay?: boolean;
          isWeb?: boolean;
        } = {}
      ) => {
        Object.keys(data).forEach((key) => {
          const currentKey = keyPrefix ? `${keyPrefix}.${key}` : key; // Maintain context for nested keys
          const entry = data[key];

          // Inherit platform flags if not explicitly defined
          const {
            isAmz = inheritedFlags.isAmz,
            isEbay = inheritedFlags.isEbay,
            isWeb = inheritedFlags.isWeb,
          } = entry || {};

          if (
            entry &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            entry.value === undefined
          ) {
            // Recurse for nested objects, passing inherited flags
            processStepData(entry, platformDetails, currentKey, {
              isAmz,
              isEbay,
              isWeb,
            });
          } else {
            const { value } = entry || {};

            // Handle nested fields explicitly
            const fieldSegments = currentKey.split(".");
            const fieldRoot = fieldSegments[0]; // e.g., "packageWeight"

            if (
              fieldRoot === "packageWeight" ||
              fieldRoot === "packageDimensions"
            ) {
              // Handle nested objects like packageWeight
              const subField = fieldSegments.slice(1).join("."); // e.g., "weightKg" or "dimensionLength"
              if (isAmz)
                platformDetails.amazon.prodDelivery[fieldRoot] =
                  platformDetails.amazon.prodDelivery[fieldRoot] || {};
              if (isEbay)
                platformDetails.ebay.prodDelivery[fieldRoot] =
                  platformDetails.ebay.prodDelivery[fieldRoot] || {};
              if (isWeb)
                platformDetails.website.prodDelivery[fieldRoot] =
                  platformDetails.website.prodDelivery[fieldRoot] || {};
              if (isAmz && subField)
                platformDetails.amazon.prodDelivery[fieldRoot][subField] =
                  value;
              if (isEbay && subField)
                platformDetails.ebay.prodDelivery[fieldRoot][subField] = value;
              if (isWeb && subField)
                platformDetails.website.prodDelivery[fieldRoot][subField] =
                  value;
            } else {
              const step = stepData.step;
              if (step === "prodTechInfo") {
                if (isAmz)
                  platformDetails.amazon.prodTechInfo[currentKey] = value;
                if (isEbay)
                  platformDetails.ebay.prodTechInfo[currentKey] = value;
                if (isWeb)
                  platformDetails.website.prodTechInfo[currentKey] = value;
              } else if (step === "productInfo") {
                // Initialize productInfo for all platforms as needed
                if (isAmz && !platformDetails.amazon.productInfo) {
                  platformDetails.amazon.productInfo = {};
                }
                if (isEbay && !platformDetails.ebay.productInfo) {
                  platformDetails.ebay.productInfo = {};
                }
                if (isWeb && !platformDetails.website.productInfo) {
                  platformDetails.website.productInfo = {};
                }
                platformDetails.website.prodTechInfo[currentKey] = value;

                // Assign values to the correct platform
                if (isAmz) {
                  platformDetails.amazon.productInfo[currentKey] = value;
                }
                if (isEbay)
                  platformDetails.ebay.productInfo[currentKey] = value;
                if (isWeb)
                  platformDetails.website.productInfo[currentKey] = value;
              } else if (step === "prodMedia") {
                // Initialize prodMedia for all platforms as needed
                if (isAmz && !platformDetails.amazon.prodMedia) {
                  platformDetails.amazon.prodMedia = {};
                }
                if (isEbay && !platformDetails.ebay.prodMedia) {
                  platformDetails.ebay.prodMedia = {};
                }
                if (isWeb && !platformDetails.website.prodMedia) {
                  platformDetails.website.prodMedia = {};
                }
                platformDetails.website.prodTechInfo[currentKey] = value;

                // Assign values to the correct platform
                if (isAmz) {
                  platformDetails.amazon.prodMedia[currentKey] = value;
                }
                if (isEbay)
                  platformDetails.ebay.prodMedia[currentKey] = value;
                if (isWeb)
                  platformDetails.website.prodMedia[currentKey] = value;
              } else if (step === "prodPricing") {
                if (isAmz)
                  platformDetails.amazon.prodPricing[currentKey] = value;
                if (isEbay)
                  platformDetails.ebay.prodPricing[currentKey] = value;
                if (isWeb)
                  platformDetails.website.prodPricing[currentKey] = value;
              } else if (step === "prodDelivery") {
                if (isAmz)
                  platformDetails.amazon.prodDelivery[currentKey] = value;
                if (isEbay)
                  platformDetails.ebay.prodDelivery[currentKey] = value;
                if (isWeb)
                  platformDetails.website.prodDelivery[currentKey] = value;
              } else {
                ``;
                if (isAmz) platformDetails.amazon.prodSeo[currentKey] = value;
                if (isEbay) platformDetails.ebay.prodSeo[currentKey] = value;
                if (isWeb) platformDetails.website.prodSeo[currentKey] = value;
              }
            }
          }
        });
      };

      processStepData(stepData, draftProduct.platformDetails);
      // Save the updated draft product
      // await draftProduct.save();
      await draftProduct.save({ validateBeforeSave: false });
      // await Product.findByIdAndUpdate(productId, stepData, {
      //   new: true,
      //   runValidators: false,
      // });

      return draftProduct;
    } catch (error) {
      console.error("Error updating draft product:", error);
      throw new Error("Failed to update draft product");
    }
  },

  getFullProductById: async (id: string) => {
    try {
      const product = await Product.findById(id)
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier");
      // .lean();

      if (!product) throw new Error("Product not found");
      return product;
    } catch (error) {
      console.error(`Error fetching full product by ID: ${id}`, error);
      throw new Error("Failed to fetch full product");
    }
  },
  
  getAllProducts: async () => {
    try {
      return await Product.find()
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw new Error("Failed to fetch products");
    }
  },
  //getting all template products name and their id

  getProductsByCondition: async (condition: Record<string, any>) => {
    try {
      // Find products matching the condition
      return await Product.find(condition)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .select(
          "_id platformDetails website.productInfo productCategory brand model srno kind"
        );
    } catch (error) {
      console.error("Error fetching products by condition:", error);
      throw new Error("Failed to fetch products by condition");
    }
  },
  getProductById: async (id: string) => {
    try {
      const product = await Product.findById(id)
        .populate("platformDetails.website.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productCategory")
        .populate("platformDetails.ebay.productInfo.productCategory")
        .populate("platformDetails.amazon.productInfo.productSupplier")
        .populate("platformDetails.ebay.productInfo.productSupplier")
        .populate("platformDetails.website.productInfo.productSupplier")
        .populate("platformDetails.website.prodPricing.paymentPolicy")
        .populate("platformDetails.amazon.prodPricing.paymentPolicy")
        .populate("platformDetails.ebay.prodPricing.paymentPolicy");
      if (!product) throw new Error("Product not found");
      // if (product.platformDetails[platform]) {
      //   return product.platformDetails[platform];
      // }
      // throw new Error(`No details found for platform: ${platform}`);
      return product;
    } catch (error) {
      // console.error(`Error fetching product by ID for platform ${platform}:`, error);
      console.error(`Error fetching product`, error);
      throw new Error("Failed to fetch product");
    }
  },

  updateProduct: async (
    id: string,
    platform: "amazon" | "ebay" | "website",
    data: any
  ) => {
    try {
      const updateQuery = { [`platformDetails.${platform}`]: data };
      const updatedProduct = await Product.findByIdAndUpdate(id, updateQuery, {
        new: true,
      });
      if (!updatedProduct) throw new Error("Product not found");
      return updatedProduct.platformDetails[platform];
    } catch (error) {
      console.error(`Error updating product for platform ${platform}:`, error);
      throw new Error("Failed to update product");
    }
  },

  deleteProduct: (id: string) => {
    const product = Product.findByIdAndDelete(id);
    if (!product) {
      throw new Error("Category not found");
    }
    return product;
  },

  toggleBlock: async (id: string, isBlocked: boolean) => {
    try {
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { isBlocked },
        { new: true }
      );
      if (!updatedProduct) throw new Error("Product not found");
      return updatedProduct;
    } catch (error) {
      console.error("Error toggling block status:", error);
      throw new Error("Failed to toggle block status");
    }
  },
  // New API for fetching product stats (separate service logic)
  getProductStats: async () => {
    try {
      const totalProducts = await Product.countDocuments({});
      const activeProducts = await Product.countDocuments({
        isBlocked: false,
      });
      const blockedProducts = await Product.countDocuments({
        isBlocked: true,
      });
      const PublishedProducts = await Product.countDocuments({
        status: "published",
      });
      const DraftProducts = await Product.countDocuments({
        status: "draft",
      });
      const TemplateProducts = await Product.countDocuments({
        isTemplate: true,
      });

      return {
        totalProducts,
        activeProducts,
        blockedProducts,
        PublishedProducts,
        DraftProducts,
        TemplateProducts,
      };
    } catch (error) {
      console.error("Error fetching Products stats:", error);
      throw new Error("Error fetching products statistics");
    }
  },

  searchAndFilterProducts: async (filters: any) => {
    try {
      const {
        searchQuery = "",
        isBlocked,
        isTemplate,
        startDate,
        endDate,
        page = 1, // Default to page 1 if not provided
        limit = 10, // Default to 10 records per page
      } = filters;

      // Convert page and limit to numbers
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      // Build the query dynamically based on filters
      const query: any = {};

      // Search within platformDetails (amazon, ebay, website) for productInfo.title and productInfo.brand
      if (searchQuery) {
        query.$or = [
          {
            "platformDetails.amazon.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.amazon.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.productInfo.title": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.productInfo.brand": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.amazon.prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.ebay.prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
          {
            "platformDetails.website.prodPricing.condition": {
              $regex: searchQuery,
              $options: "i",
            },
          },
        ];
      }

      // Add filters for isBlocked and isTemplate
      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }
      if (isTemplate !== undefined) {
        query.isTemplate = isTemplate;
      }

      // Date range filter for createdAt
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        query.createdAt = dateFilter;
      }

      // Pagination logic: apply skip and limit
      const products = await Product.find(query)
        .populate("userType")
        .skip(skip) // Correct application of skip
        .limit(limitNumber); // Correct application of limit

      // Count total products
      const totalProducts = await Product.countDocuments(query);

      return {
        products,
        pagination: {
          totalProducts,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalProducts / limitNumber),
          perPage: limitNumber,
        },
      };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },
};

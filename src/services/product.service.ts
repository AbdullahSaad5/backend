import { Product, User } from "@/models";
import Papa from "papaparse";
import mongoose from "mongoose";
import fs from "fs";
import { validateCsvData } from "@/utils/bulkImport.util";
const setNestedValue = (obj: any, path: string[], value: any) => {
  let current = obj;
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (i === path.length - 1) {
      current[key] = value;
    } else {
      current[key] = current[key] || {};
      current = current[key];
    }
  }
};
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
      //  if(stepData.prodPricing.images){
      // Object.entries(stepData).forEach(([key, value]: [string, any]) => {
      //   const { value: fieldValue, amazon, ebay, website } = value || {};
      //   if (amazon)
      //     draftProduct.platformDetails.amazon.productInfo[key] = fieldValue;
      //   if (ebay)
      //     draftProduct.platformDetails.ebay.productInfo[key] = fieldValue;
      //   if (website)
      //     draftProduct.platformDetails.website.productInfo[key] = fieldValue;
      // });
      // }
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
      // console.log("🔹 Incoming stepData:", JSON.stringify(stepData, null, 2));

      // Fetch the existing draft product
      const draftProduct: any = await Product.findById(productId);
      if (!draftProduct) {
        throw new Error("Draft product not found");
      }
      // console.log("draftProduct in updateDraftProduct service : ", draftProduct);
      // console.log("stepDataaa in updateDraftProduct service : ", stepData);

      // console.log(
      //   "🔹 Draft product before update:",
      //   JSON.stringify(draftProduct, null, 2)
      // );

      // Final step update (status and isTemplate)
      if (stepData.status !== undefined) {
        draftProduct.status = stepData.status;
        draftProduct.isTemplate = stepData.isTemplate;
        // console.log("🔹 Updating status and isTemplate:", {
        //   status: stepData.status,
        //   isTemplate: stepData.isTemplate,
        // });
        await draftProduct.save({ validateBeforeSave: false });
        return draftProduct;
      }

      // Recursive function to update platform details
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
          const currentKey = keyPrefix ? `${keyPrefix}.${key}` : key;
          const entry = data[key];

          // Inherit platform flags
          const {
            isAmz = inheritedFlags.isAmz,
            isEbay = inheritedFlags.isEbay,
            isWeb = inheritedFlags.isWeb,
          } = entry || {};
          console.log("inheritedFlags.isAmz", inheritedFlags.isAmz);
          console.log("inheritedFlags.isEbay", inheritedFlags.isEbay);
          console.log("inheritedFlags.isWeb", inheritedFlags.isWeb);

          if (
            entry &&
            typeof entry === "object" &&
            !Array.isArray(entry) &&
            entry.value === undefined
          ) {
            // Recursive call for nested objects
            processStepData(entry, platformDetails, currentKey, {
              isAmz,
              isEbay,
              isWeb,
            });
          } else {
            let value = entry?.value ?? entry;
            const step = stepData.step;
            console.log(`🔹 Processing: ${currentKey} | Value:`, value);

            if (step === "productInfo") {
              if (isAmz) platformDetails.amazon.productInfo ||= {};
              if (isEbay) platformDetails.ebay.productInfo ||= {};
              if (isWeb) platformDetails.website.productInfo ||= {};
              if (isAmz) platformDetails.amazon.productInfo[currentKey] = value;
              if (isEbay) platformDetails.ebay.productInfo[currentKey] = value;
              if (isWeb)
                platformDetails.website.productInfo[currentKey] = value;
              if (currentKey === "productSupplier") {
                platformDetails.amazon.productInfo.productSupplier = value;
                platformDetails.ebay.productInfo.productSupplier = value;
                platformDetails.website.productInfo.productSupplier = value;
              }
            } else if (step === "prodMedia") {
              if (currentKey.startsWith("platformMedia.")) {
                const keyParts = currentKey.split(".").slice(1); // ["ebay", "images"]
                if (
                  keyParts.length === 2 &&
                  ["amazon", "ebay", "website"].includes(keyParts[0]) &&
                  ["images", "videos"].includes(keyParts[1])
                ) {
                  const [platform, mediaType] = keyParts;

                  // 1. Initialize platform if missing
                  if (!platformDetails[platform]) {
                    platformDetails[platform] = {}; // ← Fixes "Cannot read 'ebay'"
                  }

                  // 2. Initialize prodMedia structure
                  if (!platformDetails[platform].prodMedia) {
                    platformDetails[platform].prodMedia = {
                      images: [],
                      videos: [],
                    };
                  }

                  // 3. Assign the media array
                  platformDetails[platform].prodMedia[mediaType] = value;
                }
              }
            } else if (step === "prodTechInfo") {
              if (isAmz) platformDetails.amazon.prodTechInfo ||= {};
              if (isEbay) platformDetails.ebay.prodTechInfo ||= {};
              if (isWeb) platformDetails.website.prodTechInfo ||= {};
              if (isAmz)
                platformDetails.amazon.prodTechInfo[currentKey] = value;
              if (isEbay) platformDetails.ebay.prodTechInfo[currentKey] = value;
              if (isWeb)
                platformDetails.website.prodTechInfo[currentKey] = value;
            } else if (step === "prodPricing") {
              if (isAmz) platformDetails.amazon.prodPricing ||= {};
              if (isEbay) platformDetails.ebay.prodPricing ||= {};
              if (isWeb) platformDetails.website.prodPricing ||= {};
              if (isAmz) platformDetails.amazon.prodPricing[currentKey] = value;
              if (isEbay) platformDetails.ebay.prodPricing[currentKey] = value;
              if (isWeb)
                platformDetails.website.prodPricing[currentKey] = value;
            }else if (step === "prodDelivery") {
              console.log("🟡 Processing prodDelivery step...");
            
              // Function to update fields dynamically
              const updateNestedField = (platform: string, shouldUpdate: boolean) => {
                if (!shouldUpdate) return; // ❌ Skip if flag is false
            
                if (!draftProduct.platformDetails[platform]) draftProduct.platformDetails[platform] = {};
                if (!draftProduct.platformDetails[platform].prodDelivery) draftProduct.platformDetails[platform].prodDelivery = {};
            
                console.log(`🔹 Platform: ${platform} | shouldUpdate: ${shouldUpdate}`);
            
                Object.keys(entry).forEach((subKey) => {
                  const subEntry = entry[subKey];
                  console.log(`🔍 Checking key: ${subKey}`, subEntry);
            
                  if (
                    typeof subEntry === "object" &&
                    subEntry !== null &&
                    "value" in subEntry
                  ) {
                    console.log(`✅ Storing direct field: ${subKey} -> ${subEntry.value}`);
                    draftProduct.platformDetails[platform].prodDelivery[subKey] = subEntry.value;
                  } else if (
                    typeof subEntry === "object" &&
                    subEntry !== null &&
                    !("value" in subEntry)
                  ) {
                    // ✅ Handle nested objects like packageWeight & packageDimensions
                    if (!draftProduct.platformDetails[platform].prodDelivery[subKey]) {
                      draftProduct.platformDetails[platform].prodDelivery[subKey] = {};
                    }
            
                    Object.keys(subEntry).forEach((nestedKey) => {
                      if (
                        typeof subEntry[nestedKey] === "object" &&
                        subEntry[nestedKey] !== null &&
                        "value" in subEntry[nestedKey]
                      ) {
                        console.log(
                          `✅ Storing nested field: ${subKey}.${nestedKey} -> ${subEntry[nestedKey].value}`
                        );
                        draftProduct.platformDetails[platform].prodDelivery[subKey][nestedKey] =
                          subEntry[nestedKey].value;
                      }
                    });
                  }
                });
            
                console.log(
                  `📌 Updated prodDelivery for ${platform}:`,
                  JSON.stringify(draftProduct.platformDetails[platform].prodDelivery, null, 2)
                );
              };
            
              // ✅ Apply updates only if the flag is true
              updateNestedField("amazon", entry.isAmz);
              updateNestedField("ebay", entry.isEbay);
              updateNestedField("website", entry.isWeb);
            
              console.log("🚀 Final prodDelivery object before saving:");
              console.log(JSON.stringify(draftProduct.platformDetails, null, 2));
            }
            
             else {
              if (isAmz) platformDetails.amazon.prodSeo ||= {};
              if (isEbay) platformDetails.ebay.prodSeo ||= {};
              if (isWeb) platformDetails.website.prodSeo ||= {};
              if (isAmz) platformDetails.amazon.prodSeo[currentKey] = value;
              if (isEbay) platformDetails.ebay.prodSeo[currentKey] = value;
              if (isWeb) platformDetails.website.prodSeo[currentKey] = value;
            }
          }
        });
      };

      processStepData(stepData, draftProduct.platformDetails);

      // console.log(
      //   "🔹 Draft product after update:",
      //   JSON.stringify(draftProduct, null, 2)
      // );

      // Save the updated draft product without running validations
      // await draftProduct.save({ validateBeforeSave: false });

      draftProduct.markModified("platformDetails.amazon.prodDelivery");
      draftProduct.markModified("platformDetails.ebay.prodDelivery");
      draftProduct.markModified("platformDetails.website.prodDelivery");

      await draftProduct.save({ validateBeforeSave: false });
      // console.log("✅ Draft product updated successfully.");

      return draftProduct;
    } catch (error: any) {
      console.error(
        "❌ Error updating draft product:",
        error.message,
        error.stack
      );
      throw new Error(`Failed to update draft product: ${error.message}`);
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
        status, // Extract status from filters
        startDate,
        endDate,
        page = 1, // Default to page 1 if not provided
        limit = 10, // Default to 10 records per page
      } = filters;

      // Convert page and limit to numbers safely
      const pageNumber = Math.max(parseInt(page, 10) || 1, 1); // Ensure minimum page is 1
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

      // Add filters for status, isBlocked, and isTemplate
      if (status && ["draft", "published"].includes(status)) {
        query.status = status;
      }
      if (isBlocked !== undefined) {
        query.isBlocked = isBlocked;
      }
      if (isTemplate !== undefined) {
        query.isTemplate = isTemplate;
      }

      // Date range filter for createdAt
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate && !isNaN(Date.parse(startDate)))
          dateFilter.$gte = new Date(startDate);
        if (endDate && !isNaN(Date.parse(endDate)))
          dateFilter.$lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) query.createdAt = dateFilter;
      }

      // Fetch products with pagination
      const products = await Product.find(query)
        .populate("userType")
        .skip(skip)
        .limit(limitNumber);

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
  //bulk import products as CSV
  bulkImportProducts: async (filePath: string): Promise<void> => {
    try {
      // ✅ Validate CSV data (supplier validation happens inside)
      const { validRows, invalidRows } = await validateCsvData(filePath);

      if (invalidRows.length > 0) {
        console.log("❌ Some rows were skipped due to validation errors:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }

      if (validRows.length === 0) {
        console.log("❌ No valid products to import.");
        return;
      }

      // ✅ Fetch all existing product titles to prevent duplicates
      const existingTitles = new Set(
        (await Product.find({}, "title")).map((p: any) => p.title)
      );

      // ✅ Fetch all suppliers in one query to optimize validation
      const supplierKeys = validRows.map(({ data }) => data.productSupplierKey);
      const existingSuppliers = await User.find(
        { supplierKey: { $in: supplierKeys } },
        "_id supplierKey"
        // ).lean();
      );
      const supplierMap = new Map(
        existingSuppliers.map((supplier) => [
          supplier.supplierKey,
          supplier._id,
        ])
      );

      // ✅ Filter out invalid suppliers
      const filteredRows = validRows.filter(({ data }) => {
        if (!supplierMap.has(data.productSupplierKey)) {
          invalidRows.push({
            row: data.row,
            errors: [`supplierKey ${data.productSupplierKey} does not exist.`],
          });
          return false;
        }
        return true;
      });

      if (filteredRows.length === 0) {
        console.log(
          "❌ No valid products to insert after supplier validation."
        );
        return;
      }

      // ✅ Bulk insert new products (avoiding duplicates)
      const bulkOperations = filteredRows
        .filter(({ data }) => !existingTitles.has(data.title))
        .map(({ data }) => ({
          insertOne: {
            document: {
              title: data.title,
              brand: data.brand,
              productDescription: data.productDescription,
              productCategory: new mongoose.Types.ObjectId(
                data.productCategory
              ),
              productSupplier: supplierMap.get(data.productSupplierKey), // ✅ Replace supplierKey with actual _id
              price: parseFloat(data.price),
              media: {
                images: data.images.map((url: string) => ({
                  url,
                  type: "image/jpeg",
                })),
                videos: data.videos.map((url: string) => ({
                  url,
                  type: "video/mp4",
                })),
              },
              platformDetails: ["amazon", "ebay", "website"].reduce(
                (acc: { [key: string]: any }, platform) => {
                  acc[platform] = {
                    productInfo: {
                      brand: data.brand,
                      title: data.title,
                      productDescription: data.productDescription,
                      productCategory: new mongoose.Types.ObjectId(
                        data.productCategory
                      ),
                      productSupplier: supplierMap.get(data.productSupplierKey),
                    },
                    prodPricing: {
                      price: parseFloat(data.price),
                      condition: "new",
                      quantity: 10,
                      vat: 5,
                    },
                    prodMedia: {
                      images: data.images.map((url: string) => ({
                        url,
                        type: "image/jpeg",
                      })),
                      videos: data.videos.map((url: string) => ({
                        url,
                        type: "video/mp4",
                      })),
                    },
                  };
                  return acc;
                },
                {}
              ),
            },
          },
        }));

      if (bulkOperations.length === 0) {
        console.log("✅ No new products to insert.");
        return;
      }

      // ✅ Perform Bulk Insert Operation
      await Product.bulkWrite(bulkOperations);
      console.log(
        `✅ Bulk import completed. Successfully added ${bulkOperations.length} new products.`
      );

      // ✅ Log skipped rows due to invalid suppliers
      if (invalidRows.length > 0) {
        console.log("❌ Some products were skipped due to invalid suppliers:");
        invalidRows.forEach(({ row, errors }) => {
          console.log(`Row ${row}: ${errors.join(", ")}`);
        });
      }
    } catch (error) {
      console.error("❌ Bulk import failed:", error);
    }
  },

  //bulk Export products to CSV
  exportProducts: async (): Promise<string> => {
    try {
      // Fetch all products from the database
      const products = await Product.find({});

      // Format the products data for CSV export
      const formattedData = products.map((product: any) => ({
        ProductID: product._id,
        Title: product.title,
        Description: product.description,
        Price: product.price,
        Category: product.category,
        // ProductSupplier: product?.supplier?.name,
        Stock: product.stock,
        SupplierId: product.supplier?._id,
        AmazonInfo: JSON.stringify(product.platformDetails.amazon.productInfo),
        EbayInfo: JSON.stringify(product.platformDetails.ebay.productInfo),
        WebsiteInfo: JSON.stringify(
          product.platformDetails.website.productInfo
        ),
      }));

      // Convert the data to CSV format using Papa.unparse
      const csv = Papa.unparse(formattedData);

      // Generate a unique file path for the export
      const filePath = `exports/products_${Date.now()}.csv`;

      // Write the CSV data to a file
      fs.writeFileSync(filePath, csv);

      console.log("✅ Export completed successfully.");
      return filePath;
    } catch (error) {
      console.error("❌ Export Failed:", error);
      throw new Error("Failed to export products.");
    }
  },
  bulkUpdateProductTaxDiscount: async (
    productIds: string[],
    discountValue: number,
    vat: number
  ) => {
    try {
      // Check if the discountValue and vat are numbers and valid
      if (typeof discountValue !== "number" || typeof vat !== "number") {
        throw new Error("Invalid discountValue or vat. They must be numbers.");
      }

      // Perform bulk update with nested prodPricing field
      const result = await Product.updateMany(
        { _id: { $in: productIds } }, // Filter valid product IDs
        {
          $set: {
            "platformDetails.amazon.prodPricing.discountValue": discountValue,
            "platformDetails.ebay.prodPricing.discountValue": discountValue,
            "platformDetails.website.prodPricing.discountValue": discountValue,
            "platformDetails.amazon.prodPricing.vat": vat,
            "platformDetails.ebay.prodPricing.vat": vat,
            "platformDetails.website.prodPricing.vat": vat,
          },
        }
      );

      if (result.modifiedCount === 0) {
        throw new Error(
          "No products were updated. Please verify product IDs and data."
        );
      }

      return result;
    } catch (error: any) {
      throw new Error(`Error during bulk update: ${error.message}`);
    }
  },
};

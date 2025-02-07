import fs from "fs";
import Papa from "papaparse";
import mongoose from "mongoose";
import { Product } from "@/models"; // Adjust file path as needed
import { parse } from "path";

/**
 * Validate CSV Data based on Product Schema
 * @param {string} filePath - Path to the CSV file.
 * @returns {object} - Validation result with valid and invalid rows.
 */
const validateCsvData = (filePath: string) => {
  const requiredColumns = [
    "brand",
    "title",
    "productDescription",
    "productCategory",
    // "productSupplier",
    "price",
    // "stock",
    // "kind",
    "images",
    // "videos",
  ];

  // Read and parse CSV file
  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsedData = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsedData.errors.length > 0) {
    throw new Error(`CSV Parsing Errors: ${JSON.stringify(parsedData.errors)}`);
  }

  const validRows: { row: number; data: any }[] = [];
  const invalidRows: { row: number; errors: string[] }[] = [];
  console.log("PARSED DATA::: ", parsedData.data);
  parsedData.data.forEach((row: any, index: number) => {
    const errors: string[] = [];

    // ✅ Required Fields Validation
    requiredColumns.forEach((col) => {
      if (!row[col]?.trim()) errors.push(`${col} is missing or empty`);
    });

    // ✅ ObjectId Validation for Foreign Keys
    if (row.productCategory && !mongoose.isValidObjectId(row.productCategory)) {
      errors.push("productCategory must be a valid MongoDB ObjectId");
    }
    // if (row.productSupplier && !mongoose.isValidObjectId(row.productSupplier)) {
    //   errors.push("productSupplier must be a valid MongoDB ObjectId");
    // }

    // ✅ Price & Stock Validation
    if (row.price && isNaN(parseFloat(row.price))) {
      errors.push("Price must be a valid number");
    }
    // if (row.stock && isNaN(parseInt(row.stock, 10))) {
    //   errors.push("Stock must be a valid integer");
    // }

    // ✅ Convert CSV String to Array for Images, Videos, and SEO Tags
    row.images = row.images ? row.images.split(",") : [];
    // row.videos = row.videos ? row.videos.split(",") : [];
    // row.seoTags = row.seoTags ? row.seoTags.split(",") : [];

    // ✅ Validate `kind` matches one of the product discriminators
    // const validKinds = [
    //   "Laptops",
    //   "Monitors",
    //   "Gaming PC",
    //   "All In One PC",
    //   "Projectors",
    //   "Network Equipments",
    // ];
    // if (!validKinds.includes(row.kind)) {
    //   errors.push(
    //     `Invalid kind: ${row.kind}. Must be one of ${validKinds.join(", ")}`
    //   );
    // }

    // ✅ Store results
    if (errors.length > 0) {
      invalidRows.push({ row: index + 1, errors });
    } else {
      validRows.push({ row: index + 1, data: row });
    }
  });

  return { validRows, invalidRows };
};

/**
 * Perform the bulk import after validation
 * @param {string} filePath - The path to the CSV file.
 * @returns {void}
 */
const bulkImportProducts = async (filePath: string): Promise<void> => {
  try {
    const { validRows, invalidRows } = validateCsvData(filePath);

    if (invalidRows.length > 0) {
      console.log("❌ Some rows are invalid. Please fix the following errors:");
      invalidRows.forEach((invalid) => {
        console.log(`Row ${invalid.row}: ${invalid.errors.join(", ")}`);
      });
      return;
    }

    const bulkOperations = validRows.map(({ data }) => ({
      updateOne: {
        filter: { title: data.title }, // Check if product already exists
        update: {
          $set: {
            title: data.title,
            brand: data.brand,
            productDescription: data.productDescription,
            productCategory: new mongoose.Types.ObjectId(data.productCategory),
            productSupplier: new mongoose.Types.ObjectId(data.productSupplier),
            price: parseFloat(data.price),
            stock: parseInt(data.stock, 10),
            kind: data.kind,
            media: { images: data.images, videos: data.videos },
            platformDetails: {
              amazon: { productInfo: { ...data } },
              ebay: { productInfo: { ...data } },
              website: { productInfo: { ...data } },
            },
          },
        },
        upsert: true, // Create new if not found
      },
    }));

    // ✅ Perform Bulk Update/Insert
    await Product.bulkWrite(bulkOperations);
    console.log("✅ Bulk import completed successfully.");
  } catch (error) {
    console.error("❌ Bulk import failed:", error);
  }
};

export { bulkImportProducts, validateCsvData };

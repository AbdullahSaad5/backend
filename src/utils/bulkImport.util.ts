import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { adminStorage, uploadFileToFirebase } from "./firebase";
import { Listing, User } from "@/models";
import { Request, Response } from "express";
import Papa from "papaparse";
import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
const uploadToFirebase = async (
  filePath: string,
  destination: string
): Promise<string | null> => {
  if (!filePath) throw new Error("No file provided!");
  try {
    const storageFile = adminStorage.file(destination);
    await storageFile.save(filePath, {
      metadata: {
        contentType: destination.includes("videos")
          ? "video/mp4"
          : "image/jpeg",
      },
      public: true,
    });
    console.log(`✅ Uploaded file to Firebase: ${destination}`);
    return `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${destination}`;
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    return null;
  }
};

const validateCsvData = async (csvFilePath: string) => {
  console.log(`📂 Validating CSV file: ${csvFilePath}`);
  const requiredColumns = [
    "brand",
    "title",
    "productDescription",
    "productSupplierKey",
    "productCategory",
    "price",
  ];

  const csvContent = fs.readFileSync(csvFilePath, "utf8");
  const parsedCSV = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsedCSV.errors.length > 0)
    throw new Error(`CSV Parsing Errors: ${JSON.stringify(parsedCSV.errors)}`);

  const validRows: { row: number; data: any }[] = [];
  const invalidRows: { row: number; errors: string[] }[] = [];
  const validIndexes = new Set<number>();
  // console.log("📂 Parsed CSV Data:", parsedCSV.data);

  for (const [index, row] of (parsedCSV.data as any[]).entries()) {
    const errors: string[] = [];

    requiredColumns.forEach((col) => {
      if (!row[col]?.trim()) errors.push(`${col} is missing or empty`);
    });

    if (!row.price || isNaN(parseFloat(row.price)))
      errors.push("Price must be a valid number");

    if (row.productSupplierKey) {
      const supplier = await User.findOne({
        supplierKey: row.productSupplierKey,
      }).select("_id");
      if (!supplier) {
        errors.push(
          `supplierKey ${row.productSupplierKey} does not exist in the database`
        );
      } else {
        row.productSupplier = supplier._id;
      }
    } else {
      errors.push("productSupplierKey is required");
    }

    if (row.productCategory && !mongoose.isValidObjectId(row.productCategory))
      errors.push("productCategory must be a valid MongoDB ObjectId");
    if (row.productSupplier && !mongoose.isValidObjectId(row.productSupplier))
      errors.push("productSupplier must be a valid MongoDB ObjectId");
    if (errors.length > 0) {
      invalidRows.push({ row: index + 1, errors });
    } else {
      validRows.push({ row: index + 1, data: row });
      validIndexes.add(index + 1);
    }
  }

  console.log(
    `✅ Valid rows: ${validRows.length}, ❌ Invalid rows: ${invalidRows.length}`
  );
  return { validRows, invalidRows, validIndexes };
};

const processZipFile = async (zipFilePath: string) => {
  const extractPath = path.join(process.cwd(), "extracted");

  try {
    console.log(`📂 Processing ZIP file: ${zipFilePath}`);
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    zip.extractAllTo(extractPath, true);

    const extractedItems = fs
      .readdirSync(extractPath)
      .filter((item) => item !== "__MACOSX");
    console.log("🔹 Extracted files:", extractedItems);

    const mainFolder =
      extractedItems.length === 1 &&
      fs.lstatSync(path.join(extractPath, extractedItems[0])).isDirectory()
        ? path.join(extractPath, extractedItems[0])
        : extractPath;

    const files = fs.readdirSync(mainFolder);
    console.log("✅ Files inside extracted folder:", files);

    const csvFile = files.find((f) => f.endsWith(".csv"));
    const mediaFolder = files.find((f) =>
      fs.lstatSync(path.join(mainFolder, f)).isDirectory()
    );

    if (!csvFile || !mediaFolder) {
      throw new Error("Invalid ZIP structure. Missing CSV or media folder.");
    }

    console.log("✅ CSV File:", csvFile);
    console.log("✅ Media Folder:", mediaFolder);

    const csvFilePath = path.join(mainFolder, csvFile);
    const { validRows, validIndexes } = await validateCsvData(csvFilePath);

    if (validRows.length === 0) {
      console.log("❌ No valid rows found in CSV. Exiting.");
      return;
    }

    for (const [index, { data }] of validRows.entries()) {
      const folderIndex = (index + 1).toString();
      if (!validIndexes.has(index + 1)) continue;

      console.log(`📂 Processing media for row: ${folderIndex}`);
      const productMediaPath = path.join(mainFolder, mediaFolder, folderIndex);
      if (!fs.existsSync(productMediaPath)) continue;

      const uploadFiles = async (files: string[], destination: string) => {
        try {
          const uploads = files.map((file) =>
            uploadFileToFirebase(file, `${destination}/${uuidv4()}`)
          );

          const results = await Promise.allSettled(uploads);

          return results
            .filter((res) => res.status === "fulfilled")
            .map((res) => (res as PromiseFulfilledResult<string>).value);
        } catch (error) {
          console.error("❌ Error uploading files:", error);
          return [];
        }
      };

      const imagesFolder = path.join(productMediaPath, "images");
      const videosFolder = path.join(productMediaPath, "videos");

      data.images = fs.existsSync(imagesFolder)
        ? await uploadFiles(
            fs.readdirSync(imagesFolder).map((f) => path.join(imagesFolder, f)),
            `products/${folderIndex}/images`
          )
        : [];

      data.videos = fs.existsSync(videosFolder)
        ? await uploadFiles(
            fs.readdirSync(videosFolder).map((f) => path.join(videosFolder, f)),
            `products/${folderIndex}/videos`
          )
        : [];
    }

    console.log("🚀 Starting bulk import...");
    await bulkImportProducts(validRows);
    console.log(`✅ Bulk import completed.`);
  } catch (error) {
    console.error("❌ Error processing ZIP file:", error);
  } finally {
    try {
      if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
        console.log("🗑️ Extracted files cleaned up.");
      }
      if (fs.existsSync(zipFilePath)) {
        // fs.unlinkSync(zipFilePath);
        console.log("🗑️ ZIP file deleted.");
      }
    } catch (err) {
      console.error("❌ Error cleaning up files:", err);
    }
  }
};

export { validateCsvData, processZipFile };
const bulkImportProducts = async (
  validRows: { row: number; data: any }[]
): Promise<void> => {
  try {
    const invalidRows: { row: number; errors: string[] }[] = [];

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
      (await Listing.find({}, "title")).map((p: any) => p.title)
    );

    // ✅ Fetch all suppliers in one query to optimize validation
    const supplierKeys = validRows.map(({ data }) => data.productSupplierKey);
    const existingSuppliers = await User.find(
      { supplierKey: { $in: supplierKeys } },
      "_id supplierKey"
      // ).lean();
    );
    const supplierMap = new Map(
      existingSuppliers.map((supplier: any) => [supplier.supplierKey, supplier._id])
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
      console.log("❌ No valid products to insert after supplier validation.");
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
            productCategory: new mongoose.Types.ObjectId(data.productCategory),
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
    await Listing.bulkWrite(bulkOperations);
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
};

import * as XLSX from "xlsx";
import { ProductCategory } from "@/models";
import dotenv from "dotenv";
import { inventoryController } from "@/controllers";
import { getStoredAmazonAccessToken } from "./amazon-helpers.util";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
export const bulkImportStandardTemplateGenerator = {
  fetchAllAmazonCategoryIds: async (): Promise<{ id: string; name: string }[]> => {
    try {
      const result = await ProductCategory.aggregate([
        {
          $match: {
            $or: [
              { amazonCategoryId: { $exists: true, $ne: null } },
              { amazonCategoryId: { $exists: true, $ne: null } },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            name: 1,
            amazonCategoryId: 1,
          },
        },
      ]);
      // Build array of { id, name } from both possible ID fields
      const allCategories = result.flatMap((item) => {
        const categories: { id: string; name: string }[] = [];
        if (item.amazonCategoryId) {
          categories.push({ id: item.amazonCategoryId.toString(), name: item.name });
        }
        return categories;
      });

      return allCategories;
    } catch (error) {
      console.error("Error fetching category IDs:", error);
      throw new Error("Failed to fetch category IDs");
    }
  },

  fetchAttributesForAllCategories: async () => {
    try {
      // Step 1: Get all category ID-name pairs
      const categoryIdNamePairs = await bulkImportStandardTemplateGenerator.fetchAllAmazonCategoryIds(); // [{ id, name }]
      if (!categoryIdNamePairs || categoryIdNamePairs.length === 0) {
        console.log("No category IDs found.");
        return [];
      }

      // Step 2: Fetch aspects for each category using Promise.allSettled
      const results = await Promise.allSettled(
        categoryIdNamePairs.map(async ({ id, name }) => {
          const aspects = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(id);
          return { categoryId: id, categoryName: name, aspects };
        })
      );

      // Step 3: Filter fulfilled results
      const fulfilledResults = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            categoryId: string;
            categoryName: string;
            aspects: any;
          }> => result.status === "fulfilled" && !!result.value?.categoryId && !!result.value.aspects
        )
        .map((result) => result.value);

      // Step 4: Log rejected results
      const failedCategories = results
        .filter((result) => result.status === "rejected")
        .map((result, index) => ({
          categoryId: categoryIdNamePairs[index].id,
          reason: result.reason?.message || "Unknown error",
        }));

      if (failedCategories.length > 0) {
        console.warn("Some categories failed to fetch aspects:", failedCategories);
      }

      // Step 5: Export to Excel with names and aspects
      if (fulfilledResults.length > 0) {
        await bulkImportStandardTemplateGenerator.exportCategoryAspectsToExcel(fulfilledResults);
      } else {
        console.log("No valid attributes to export.");
      }

      return fulfilledResults;
    } catch (error) {
      console.error("Error fetching attributes for all categories:", error);
      throw error;
    }
  },
  getAmazonActualSchema: async (id: string): Promise<any> => {
    try {
      if (!id) {
        throw new Error("Missing productType parameter");
      }

      const spApiUrl = `https://sellingpartnerapi-eu.amazon.com/definitions/2020-09-01/productTypes/${id}?marketplaceIds=A1F83G8C2ARO7P`;
      const accessToken = await getStoredAmazonAccessToken();

      // Fetch SP API product type schema metadata
      const spApiResponse = await fetch(spApiUrl, {
        method: "GET",
        headers: {
          "x-amz-access-token": accessToken ?? "",
          "Content-Type": "application/json",
        },
      });

      if (!spApiResponse.ok) {
        throw new Error(`Failed to fetch product type schema: ${spApiResponse.statusText}`);
      }

      const spApiData = await spApiResponse.json();
      const schemaUrl = spApiData.schema?.link?.resource;
      if (!schemaUrl) {
        throw new Error("Schema link resource not found");
      }

      // Fetch actual schema JSON from schemaUrl
      const schemaResponse = await fetch(schemaUrl);
      if (!schemaResponse.ok) {
        throw new Error(`Failed to fetch actual schema: ${schemaResponse.statusText}`);
      }

      const actualSchema = await schemaResponse.json();
      console.log(`Fetched schema for productType ${id}`, actualSchema);

      return actualSchema;
    } catch (error: any) {
      console.error(`Error fetching schema for productType ${id}:`, error.message);
      throw error;
    }
  },
  exportCategoryAspectsToExcel: async (
    allCategoryAspects: { categoryId: string; categoryName: string; aspects: any }[],
    filePath: string = "CategoryAspects.xlsx"
  ) => {
    const workbook = XLSX.utils.book_new();

    allCategoryAspects.forEach(({ categoryId, categoryName, aspects }) => {
      const aspectList = aspects?.aspects || [];

      const uniqueHeaders = new Set<string>();

      // Add static required fields first
      const staticHeaders = ["Allow Variations*", "Title*", "Description*", "inventoryCondition*", "Brand*"];
      staticHeaders.forEach((header) => uniqueHeaders.add(header));

      // Add dynamic headers with required & variation flags
      aspectList.forEach((aspect: any) => {
        let title = aspect.localizedAspectName || "Unknown";
        const isRequired = aspect.aspectConstraint?.aspectRequired;
        const isVariation = aspect.aspectConstraint?.aspectEnabledForVariations;

        if (isRequired) title += "*";
        if (isVariation) title += " (variation allowed)";

        uniqueHeaders.add(title);
      });

      const headers = Array.from(uniqueHeaders);
      const data = [headers]; // first row is header

      const worksheet = XLSX.utils.aoa_to_sheet(data);

      const idPart = ` (${categoryId})`;
      let safeName = categoryName.replace(/[\\/?*[\]:]/g, ""); // clean illegal chars

      const maxNameLength = 31 - idPart.length;
      if (safeName.length > maxNameLength) {
        safeName = safeName.slice(0, maxNameLength); // trim name only
      }

      const sheetName = `${safeName}${idPart}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, filePath);
    console.log(`✅ Excel file generated: ${filePath}`);
  },

  // Test function to verify dropdown functionality
  testDropdowns: async () => {
    const testAttributes = [
      {
        name: "Product",
        type: "string",
        required: true,
      },
      {
        name: "Category",
        type: "enum",
        enums: ["Electronics", "Clothing", "Books", "Home"],
        required: true,
      },
      {
        name: "Status",
        type: "enum",
        enums: ["Available", "Out of Stock", "Discontinued"],
        required: true,
      },
      {
        name: "Priority",
        type: "enum",
        enums: ["High", "Medium", "Low"],
        required: false,
      },
    ];

    // Mock request and response
    const req: any = { body: { attributes: testAttributes } };
    const res: any = {
      setHeader: () => {},
      send: (buffer: any) => {
        const fs = require("fs");
        fs.writeFileSync("./test-dropdown-template.xlsx", buffer);
        console.log("✅ Test template created: test-dropdown-template.xlsx");
      },
    };

    await inventoryController.generateXLSXTemplate(req, res);
  },
};

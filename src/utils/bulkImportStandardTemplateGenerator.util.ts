import * as XLSX from "xlsx";
import { ProductCategory } from "@/models";
import dotenv from "dotenv";
import { inventoryController } from "@/controllers";
import { getStoredAmazonAccessToken } from "./amazon-helpers.util";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

interface CategoryIdNamePair {
  id: string;
  name: string;
}

interface ParsedAttribute {
  name: string;
  type: string;
  required: boolean;
  validations: {
    title: string;
    description: string;
    editable: boolean;
    hidden: boolean;
    examples: any[];
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum: string[];
    enumNames: string[];
    selectors: string[];
    minItems?: number;
    maxItems?: number;
    minUniqueItems?: number;
    maxUniqueItems?: number;
  };
}

interface CategoryResult {
  categoryId: string;
  categoryName: string;
  attributes: ParsedAttribute[];
}

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
    console.log("[fetchAttributesForAllCategories] Starting attribute fetch process at", new Date().toISOString());

    try {
      // Step 1: Get all category ID-name pairs
      console.log("[fetchAttributesForAllCategories] Fetching category ID-name pairs");
      const categoryIdNamePairs: CategoryIdNamePair[] =
        await bulkImportStandardTemplateGenerator.fetchAllAmazonCategoryIds();

      if (!categoryIdNamePairs || categoryIdNamePairs.length === 0) {
        console.warn("[fetchAttributesForAllCategories] No category IDs found");
        return [];
      }
      console.log(`[fetchAttributesForAllCategories] Retrieved ${categoryIdNamePairs.length} category ID-name pairs`);

      // Step 2: Fetch schemas for each category using Promise.allSettled
      console.log("[fetchAttributesForAllCategories] Fetching schemas for categories");
      const results = await Promise.allSettled(
        categoryIdNamePairs.map(async ({ id, name }: CategoryIdNamePair, index: number) => {
          console.log(
            `[fetchAttributesForAllCategories] Processing category ${index + 1}/${categoryIdNamePairs.length}: ID=${id}, Name=${name}`
          );
          try {
            const schema = await bulkImportStandardTemplateGenerator.getAmazonActualSchema(id);
            if (!schema) {
              console.warn(`[fetchAttributesForAllCategories] No schema returned for category ID=${id}`);
              throw new Error("Empty schema");
            }
            const parsedAttributes = parseSchemaAttributes(schema);
            if (parsedAttributes.length === 0) {
              console.warn(
                `[fetchAttributesForAllCategories] No attributes parsed for category ID=${id}, Name=${name}`
              );
            } else {
              console.log(
                `[fetchAttributesForAllCategories] Parsed ${parsedAttributes.length} attributes for category ID=${id}`
              );
            }
            return { categoryId: id, categoryName: name, attributes: parsedAttributes };
          } catch (error) {
            console.error(`[fetchAttributesForAllCategories] Error processing category ID=${id}:`, error);
            throw error;
          }
        })
      );

      // Step 3: Filter fulfilled results
      console.log("[fetchAttributesForAllCategories] Filtering fulfilled results");
      const fulfilledResults = results
        .filter(
          (result): result is PromiseFulfilledResult<CategoryResult> =>
            result.status === "fulfilled" && !!result.value?.categoryId && !!result.value?.attributes
        )
        .map((result) => result.value);
      console.log(`[fetchAttributesForAllCategories] Found ${fulfilledResults.length} fulfilled results`);

      // Step 4: Log rejected results
      const failedCategories = results
        .filter((result) => result.status === "rejected")
        .map((result: PromiseRejectedResult, index) => {
          const categoryId = categoryIdNamePairs[index]?.id || "unknown";
          const reason = result.reason?.message || "Unknown error";
          console.error(`[fetchAttributesForAllCategories] Failed category ID=${categoryId}: ${reason}`);
          return { categoryId, reason };
        });
      if (failedCategories.length > 0) {
        console.warn(
          `[fetchAttributesForAllCategories] ${failedCategories.length} categories failed to fetch attributes:`,
          failedCategories
        );
      }

      // Step 5: Export to Excel with parsed attributes
      if (fulfilledResults.length > 0) {
        console.log("[fetchAttributesForAllCategories] Exporting attributes to Excel");
        await bulkImportStandardTemplateGenerator.exportCategoryAspectsToExcel(fulfilledResults);
        console.log("[fetchAttributesForAllCategories] Successfully exported attributes to Excel");
      } else {
        console.warn("[fetchAttributesForAllCategories] No valid attributes to export");
      }

      console.log(
        `[fetchAttributesForAllCategories] Process completed. Fulfilled: ${fulfilledResults.length}, Failed: ${failedCategories.length}`
      );
      return fulfilledResults;
    } catch (error) {
      console.error("[fetchAttributesForAllCategories] Fatal error fetching attributes for all categories:", error);
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
function parseSchemaAttributes(schema: any): ParsedAttribute[] {
  console.log("[parseSchemaAttributes] Starting schema parsing");
  if (!schema?.properties) {
    console.warn("[parseSchemaAttributes] Invalid or empty schema provided");
    return [];
  }

  const attributes: ParsedAttribute[] = [];

  function extractAttributes(properties: any, parentPath: string = "") {
    if (!properties) return;

    Object.entries(properties).forEach(([key, prop]: [string, any]) => {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;

      // Skip $defs and other non-attribute properties
      if (key === "$defs" || key === "$schema" || key === "$id" || key === "$comment") {
        console.log(`[parseSchemaAttributes] Skipping non-attribute property: ${key}`);
        return;
      }

      console.log(`[parseSchemaAttributes] Processing attribute: ${currentPath}`);
      const attrInfo: ParsedAttribute = {
        name: currentPath,
        type: prop.type || "unknown",
        required: schema.required?.includes(key) || false,
        validations: {
          title: prop.title || "",
          description: prop.description || "",
          editable: prop.editable !== false,
          hidden: prop.hidden || false,
          examples: prop.examples || [],
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          minimum: prop.minimum,
          maximum: prop.maximum,
          enum: prop.enum || [],
          enumNames: prop.enumNames || [],
          selectors: prop.selectors || [],
          minItems: prop.minItems,
          maxItems: prop.maxItems,
          minUniqueItems: prop.minUniqueItems,
          maxUniqueItems: prop.maxUniqueItems,
        },
      };

      attributes.push(attrInfo);

      // Handle nested items
      if (prop.type === "array" && prop.items?.properties) {
        console.log(`[parseSchemaAttributes] Processing nested array properties for ${currentPath}`);
        extractAttributes(prop.items.properties, currentPath);
      } else if (prop.type === "object" && prop.properties) {
        console.log(`[parseSchemaAttributes] Processing nested object properties for ${currentPath}`);
        extractAttributes(prop.properties, currentPath);
      }
    });
  }

  extractAttributes(schema.properties);
  console.log(`[parseSchemaAttributes] Completed parsing. Found ${attributes.length} attributes`);
  return attributes;
}

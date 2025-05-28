import fs from "fs";

// Load JSON schema file
function loadSchema(filePath) {
  const rawData = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(rawData);
}

// Function from earlier to check variations
function checkVariationSupport(schema) {
  const hasParentageLevel = schema.properties && schema.properties.parentage_level;
  const hasChildParentSkuRelationship = schema.properties && schema.properties.child_parent_sku_relationship;
  const hasVariationTheme = schema.properties && schema.properties.variation_theme;

  const hasVariationCondition =
    Array.isArray(schema.allOf) &&
    schema.allOf.some((rule) => {
      if (!rule.if) return false;
      const ifStr = JSON.stringify(rule.if);
      return (
        ifStr.includes("parentage_level") &&
        (ifStr.includes("child_parent_sku_relationship") || ifStr.includes("variation_theme"))
      );
    });

  return !!(hasParentageLevel || hasChildParentSkuRelationship || hasVariationTheme || hasVariationCondition);
}

// Usage example
const schemaFilePath = "/src/testJsons/projectorsTEST.json";
const schema = loadSchema(schemaFilePath);
const supportsVariations = checkVariationSupport(schema);

console.log(`Schema supports variations? ${supportsVariations}`);

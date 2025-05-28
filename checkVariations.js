"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
// Load JSON schema file
function loadSchema(filePath) {
    var rawData = fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(rawData);
}
// Function from earlier to check variations
function checkVariationSupport(schema) {
    var hasParentageLevel = schema.properties && schema.properties.parentage_level;
    var hasChildParentSkuRelationship = schema.properties && schema.properties.child_parent_sku_relationship;
    var hasVariationTheme = schema.properties && schema.properties.variation_theme;
    var hasVariationCondition = Array.isArray(schema.allOf) &&
        schema.allOf.some(function (rule) {
            if (!rule.if)
                return false;
            var ifStr = JSON.stringify(rule.if);
            return (ifStr.includes("parentage_level") &&
                (ifStr.includes("child_parent_sku_relationship") || ifStr.includes("variation_theme")));
        });
    return !!(hasParentageLevel || hasChildParentSkuRelationship || hasVariationTheme || hasVariationCondition);
}
// Usage example
var schemaFilePath = "/src/testJsons/projectorsTEST.json";
var schema = loadSchema(schemaFilePath);
var supportsVariations = checkVariationSupport(schema);
console.log("Schema supports variations? ".concat(supportsVariations));

/**
 * Very–lightweight JSON-Schema validator specialised for Amazon Selling Partner
 * product-type schemas (draft-07 like style with $defs, allOf, array/item rules,
 * custom keywords such as `editable`, `hidden`, `enumNames`, etc.).
 *
 * No external dependencies and fully synchronous.
 */

// Public API ---------------------------------------------------------------

/**
 * Validate `data` against `schema`.
 * @param {Object} schema – JSON schema to validate against.
 * @param {*}      data   – Arbitrary user payload.
 * @param {Array<string>} variationAspects – Optional array of aspect names or paths that should be treated as having variations:true.
 *                                           Supports simple names like 'hard_disk' or nested paths like 'hard_disk.size' or 'hard_disk[*].size'
 * @returns {{valid:boolean,errors:Array<{path:string,message:string,title?:string,severity?:string,code?:string,category?:string,schemaPath?:string}>}}
 */
function validate(schema, data, variationAspects = []) {
  const errors = [];
  validateSchema(schema, data, "root", schema, errors, "", variationAspects);
  return { valid: errors.length === 0, errors };
}

// -------------------------------------------------------------------------
// Core dispatchers
// -------------------------------------------------------------------------

/**
 * Generic validator that dispatches to specialised routines based on schema
 * contents (type, allOf/oneOf/anyOf, $ref, etc.).
 */
function validateSchema(schema, data, path, rootSchema, errors, schemaPath = "", variationAspects = []) {
  if (!schema || typeof schema !== "object") {
    errors.push(
      createError(path, "Invalid or empty schema node", {
        code: "INVALID_SCHEMA",
        schemaPath,
        category: "SCHEMA_ERROR",
      })
    );
    return;
  }

  // $ref handling – resolve and replace
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, rootSchema);
    if (!resolved) {
      errors.push(
        createError(path, `Unable to resolve $ref ${schema.$ref}`, {
          code: "UNRESOLVED_REF",
          schemaPath,
          category: "SCHEMA_ERROR",
          expectedValue: schema.$ref,
        })
      );
      return;
    }
    validateSchema(resolved, data, path, rootSchema, errors, schemaPath, variationAspects);
    return;
  }

  // Handle meta-keywords first (allOf/anyOf/oneOf)
  if (schema.allOf) {
    validateAllOf(schema.allOf, data, path, rootSchema, errors, schemaPath, variationAspects);
  }
  if (schema.anyOf) {
    validateAnyOf(schema.anyOf, data, path, rootSchema, errors, schemaPath, variationAspects);
  }
  if (schema.oneOf) {
    validateOneOf(schema.oneOf, data, path, rootSchema, errors, schemaPath, variationAspects);
  }

  // Type-based validation – use explicit type first, then infer if missing
  const explicitType = schema.type;
  const inferredType = schema.properties
    ? "object"
    : schema.items || schema.contains
    ? "array"
    : schema.required
    ? "object"
    : undefined;

  const expectedType = explicitType || inferredType;

  switch (expectedType) {
    case "object":
      validateObject(schema, data, path, rootSchema, errors, schemaPath, variationAspects);
      break;
    case "array":
      validateArray(schema, data, path, rootSchema, errors, schemaPath, variationAspects);
      break;
    case "string":
    case "number":
    case "integer":
    case "boolean":
    case "null":
      validatePrimitive(schema, data, path, errors, schemaPath);
      break;
    default:
      // If no explicit type, still allow recursion for nested keywords.
      if (schema.properties || schema.items) {
        validateObject(schema, data, path, rootSchema, errors, schemaPath, variationAspects);
      } else if (schema.enum || schema.pattern || schema.const !== undefined || schema.format) {
        // Primitive constraints without explicit type
        validatePrimitive({ ...schema, type: getJsonType(data) }, data, path, errors, schemaPath);
      }
  }

  // Custom Amazon vocab – warn only
  handleCustomVocabulary(schema, path);
}

// -------------------------------------------------------------------------
// $ref resolver
// -------------------------------------------------------------------------

function resolveRef(ref, rootSchema) {
  if (!ref.startsWith("#/")) return null;
  const parts = ref
    .substring(2)
    .split("/")
    .map((p) => decodeURIComponent(p));
  let target = rootSchema;
  for (const segment of parts) {
    if (target && Object.prototype.hasOwnProperty.call(target, segment)) {
      target = target[segment];
    } else {
      return null;
    }
  }
  return target;
}

// -------------------------------------------------------------------------
// Object validation
// -------------------------------------------------------------------------

function validateObject(schema, data, path, rootSchema, errors, schemaPath, variationAspects) {
  const actualType = getJsonType(data);
  if (schema.type === "object") {
    if (actualType !== "object") {
      errors.push(
        createError(path, `Expected object but got ${actualType}`, {
          code: "TYPE_MISMATCH",
          category: "TYPE_ERROR",
          schemaPath,
          title: schema.title,
          expectedValue: "object",
          actualValue: actualType,
        })
      );
      return;
    }
  } else {
    // For schemas without explicit type, if data isn't an object, skip deeper
    if (actualType !== "object") {
      return; // cannot validate nested properties against non-object value
    }
  }

  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      // Support Amazon's dotted path notation like "display.size"
      if (req.includes(".")) {
        const segments = req.split(".");
        if (!existsByPath(data, segments)) {
          errors.push(
            createError(`${path}.${req}`, "Required property missing", {
              code: "90220",
              category: "MISSING_ATTRIBUTE",
              schemaPath: `${schemaPath}/required`,
              attributeNames: [req],
              title: schema.title || `Missing ${req}`,
            })
          );
        }
      } else {
        if (!(req in data)) {
          // Try to get title from property schema
          const propSchema = schema.properties?.[req];
          const propTitle = propSchema?.title || req;

          errors.push(
            createError(`${path}.${req}`, `'${propTitle}' is required but not supplied.`, {
              code: "90220",
              category: "MISSING_ATTRIBUTE",
              schemaPath: `${schemaPath}/required`,
              attributeNames: [req],
              title: propTitle,
            })
          );
        }
      }
    }
  }

  const props = schema.properties || {};
  for (const [key, propSchema] of Object.entries(props)) {
    if (key in data) {
      validateSchema(
        propSchema,
        data[key],
        `${path}.${key}`,
        rootSchema,
        errors,
        `${schemaPath}/properties/${key}`,
        variationAspects
      );
    }
  }
}

/**
 * Helper to check existence of nested property path supporting arrays.
 * For arrays, returns true if ANY element satisfies the remainder path.
 * @param {any} obj       – Current data fragment.
 * @param {string[]} segs – Remaining path segments.
 * @returns {boolean}
 */
function existsByPath(obj, segs) {
  if (segs.length === 0) return true;
  if (obj === null || obj === undefined) return false;

  const [first, ...rest] = segs;
  if (Array.isArray(obj)) {
    // At array level: property may exist in ANY element
    return obj.some((item) => existsByPath(item, segs));
  }
  if (typeof obj === "object") {
    if (!Object.prototype.hasOwnProperty.call(obj, first)) return false;
    return existsByPath(obj[first], rest);
  }
  return false;
}

// -------------------------------------------------------------------------
// Array validation
// -------------------------------------------------------------------------

function validateArray(schema, data, path, rootSchema, errors, schemaPath, variationAspects) {
  if (!Array.isArray(data)) {
    errors.push(
      createError(path, `Expected array but got ${getJsonType(data)}`, {
        code: "TYPE_MISMATCH",
        category: "TYPE_ERROR",
        schemaPath,
        title: schema.title,
        expectedValue: "array",
        actualValue: getJsonType(data),
      })
    );
    return;
  }

  const { minItems, maxItems, minUniqueItems, maxUniqueItems } = schema;

  // Check if this path matches any of the variation aspects
  // Support various path patterns:
  // - Simple aspect name: 'hard_disk' matches 'root.hard_disk' or '*.hard_disk'
  // - Nested path: 'hard_disk.size' matches 'root.hard_disk[*].size'
  // - Array notation: 'hard_disk[*].size' explicitly matches array elements
  const hasVariations = variationAspects.some((aspect) => {
    // Remove 'root.' prefix from path for easier matching
    const cleanPath = path.startsWith("root.") ? path.substring(5) : path;

    if (aspect.includes(".")) {
      // Handle nested paths like 'hard_disk.size'
      // Convert the clean path to remove array indices for pattern matching
      const pathWithoutIndices = cleanPath.replace(/\[\d+\]/g, "");

      // Check if the aspect matches the path structure
      return pathWithoutIndices === aspect;
    } else {
      // Simple aspect name matching (backward compatibility)
      return path.endsWith(`.${aspect}`) || path === `root.${aspect}` || cleanPath === aspect;
    }
  });

  if (typeof minItems === "number" && data.length < minItems) {
    errors.push(
      createError(path, `Array has fewer items (${data.length}) than minimum ${minItems}`, {
        code: "ARRAY_TOO_SHORT",
        category: "CONSTRAINT_VIOLATION",
        schemaPath: `${schemaPath}/minItems`,
        title: schema.title,
        expectedValue: `>= ${minItems}`,
        actualValue: data.length,
      })
    );
  }
  // Only enforce maxItems if this aspect is not in the variations list
  if (typeof maxItems === "number" && data.length > maxItems && !hasVariations) {
    errors.push(
      createError(path, `Array has more items (${data.length}) than maximum ${maxItems}`, {
        code: "ARRAY_TOO_LONG",
        category: "CONSTRAINT_VIOLATION",
        schemaPath: `${schemaPath}/maxItems`,
        title: schema.title,
        expectedValue: `<= ${maxItems}`,
        actualValue: data.length,
      })
    );
  }

  // Uniqueness – simple JSON.stringify comparison
  // Only enforce minUniqueItems/maxUniqueItems if this aspect is not in the variations list
  if ((typeof minUniqueItems === "number" || typeof maxUniqueItems === "number") && !hasVariations) {
    const unique = new Set(data.map((v) => JSON.stringify(v)));
    if (typeof minUniqueItems === "number" && unique.size < minUniqueItems) {
      errors.push(
        createError(path, `Array unique items (${unique.size}) less than minimum ${minUniqueItems}`, {
          code: "INSUFFICIENT_UNIQUE_ITEMS",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/minUniqueItems`,
          title: schema.title,
          expectedValue: `>= ${minUniqueItems}`,
          actualValue: unique.size,
        })
      );
    }
    if (typeof maxUniqueItems === "number" && unique.size > maxUniqueItems) {
      errors.push(
        createError(path, `Array unique items (${unique.size}) greater than maximum ${maxUniqueItems}`, {
          code: "TOO_MANY_UNIQUE_ITEMS",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/maxUniqueItems`,
          title: schema.title,
          expectedValue: `<= ${maxUniqueItems}`,
          actualValue: unique.size,
        })
      );
    }
  }

  // Item validation
  if (schema.items) {
    data.forEach((item, idx) => {
      validateSchema(
        schema.items,
        item,
        `${path}[${idx}]`,
        rootSchema,
        errors,
        `${schemaPath}/items`,
        variationAspects
      );
    });
  }

  // Draft-07 `contains` – ensure at least one array element matches sub-schema.
  if (schema.contains) {
    let matchCount = 0;
    data.forEach((item) => {
      const temp = [];
      validateSchema(schema.contains, item, path, rootSchema, temp, `${schemaPath}/contains`, variationAspects);
      if (temp.length === 0) matchCount += 1;
    });

    const minContains = typeof schema.minContains === "number" ? schema.minContains : 1;
    const maxContains = typeof schema.maxContains === "number" ? schema.maxContains : undefined;

    if (matchCount < minContains) {
      errors.push(
        createError(path, `Array must contain at least ${minContains} item(s) matching contains schema`, {
          code: "CONTAINS_VIOLATION",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/contains`,
          title: schema.title,
          expectedValue: `>= ${minContains} matching items`,
          actualValue: `${matchCount} matching items`,
        })
      );
    } else if (maxContains !== undefined && matchCount > maxContains) {
      errors.push(
        createError(path, `Array must contain no more than ${maxContains} items matching contains schema`, {
          code: "CONTAINS_VIOLATION",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/contains`,
          title: schema.title,
          expectedValue: `<= ${maxContains} matching items`,
          actualValue: `${matchCount} matching items`,
        })
      );
    }
  }
}

// -------------------------------------------------------------------------
// Primitive validation (string, number, boolean, etc.)
// -------------------------------------------------------------------------

function validatePrimitive(schema, data, path, errors, schemaPath) {
  const actualType = getJsonType(data);
  if (!typeMatches(schema.type, data)) {
    errors.push(
      createError(path, `Expected ${schema.type} but got ${actualType}`, {
        code: "TYPE_MISMATCH",
        category: "TYPE_ERROR",
        schemaPath: `${schemaPath}/type`,
        title: schema.title,
        expectedValue: schema.type,
        actualValue: actualType,
      })
    );
    return;
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(
      createError(path, `Value ${JSON.stringify(data)} not in enum`, {
        code: "ENUM_VIOLATION",
        category: "CONSTRAINT_VIOLATION",
        schemaPath: `${schemaPath}/enum`,
        title: schema.title,
        expectedValue: schema.enum,
        actualValue: data,
      })
    );
  }

  if (schema.pattern && typeof data === "string") {
    const re = new RegExp(schema.pattern);
    if (!re.test(data)) {
      errors.push(
        createError(path, `String does not match pattern ${schema.pattern}`, {
          code: "PATTERN_VIOLATION",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/pattern`,
          title: schema.title,
          expectedValue: schema.pattern,
          actualValue: data,
        })
      );
    }
  }

  // Format validation for strings
  if (schema.format && typeof data === "string") {
    let isValid = true;
    let formatError = "";

    switch (schema.format) {
      case "date":
        // Validate YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(data)) {
          isValid = false;
          formatError = "Expected date format YYYY-MM-DD";
        } else {
          // Check if it's a valid date
          const date = new Date(data + "T00:00:00.000Z");
          if (isNaN(date.getTime()) || date.toISOString().substr(0, 10) !== data) {
            isValid = false;
            formatError = "Invalid date value";
          }
        }
        break;

      case "date-time":
        // Validate ISO 8601 date-time format - must include time component
        const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!dateTimeRegex.test(data)) {
          isValid = false;
          formatError = "Expected date-time format YYYY-MM-DDTHH:mm:ss[.sss][Z]";
        } else {
          // Check if it's a valid date-time
          const date = new Date(data);
          if (isNaN(date.getTime())) {
            isValid = false;
            formatError = "Invalid date-time value";
          }
        }
        break;

      // Add more format validations as needed
      default:
        // Unknown format - just skip validation for now
        break;
    }

    if (!isValid) {
      errors.push(
        createError(path, `String does not match format ${schema.format}: ${formatError}`, {
          code: "FORMAT_VIOLATION",
          category: "CONSTRAINT_VIOLATION",
          schemaPath: `${schemaPath}/format`,
          title: schema.title,
          expectedValue: schema.format,
          actualValue: data,
        })
      );
    }
  }
}

function typeMatches(expected, value) {
  const actual = getJsonType(value);
  switch (expected) {
    case "number":
      // Draft-07: "number" includes both integer and non-integer numeric values
      return actual === "number" || actual === "integer";
    case "integer":
      return actual === "integer";
    default:
      return actual === expected;
  }
}

// -------------------------------------------------------------------------
// allOf / anyOf / oneOf handling
// -------------------------------------------------------------------------

function validateAllOf(list, data, path, rootSchema, errors, schemaPath, variationAspects) {
  for (const sub of list) {
    // Conditional support: if/then/else inside allOf element
    if (sub.if) {
      const conditionErrors = [];
      validateSchema(sub.if, data, path, rootSchema, conditionErrors, schemaPath, variationAspects);
      const conditionMet = conditionErrors.length === 0;
      if (conditionMet && sub.then) {
        validateSchema(sub.then, data, path, rootSchema, errors, schemaPath, variationAspects);
      } else if (!conditionMet && sub.else) {
        validateSchema(sub.else, data, path, rootSchema, errors, schemaPath, variationAspects);
      }
    } else {
      validateSchema(sub, data, path, rootSchema, errors, schemaPath, variationAspects);
    }
  }
}

function validateAnyOf(list, data, path, rootSchema, errors, schemaPath, variationAspects) {
  let anyValid = false;
  const collectedErrors = [];
  for (const sub of list) {
    const tempErrors = [];
    validateSchema(sub, data, path, rootSchema, tempErrors, schemaPath, variationAspects);
    if (tempErrors.length === 0) {
      anyValid = true;
      break;
    }
    collectedErrors.push(...tempErrors);
  }
  if (!anyValid) {
    errors.push(
      createError(path, "Failed to match anyOf schemas", {
        code: "ANYOF_VIOLATION",
        category: "SCHEMA_VIOLATION",
        schemaPath: `${schemaPath}/anyOf`,
        title: "Value must match at least one schema",
        details: collectedErrors,
      })
    );
  }
}

function validateOneOf(list, data, path, rootSchema, errors, schemaPath, variationAspects) {
  let matchCount = 0;

  for (const sub of list) {
    const tempErrors = [];
    validateSchema(sub, data, path, rootSchema, tempErrors, schemaPath, variationAspects);
    const isMatch = tempErrors.length === 0;

    if (isMatch) {
      matchCount += 1;
    }
  }

  if (matchCount !== 1) {
    errors.push(
      createError(path, `Failed oneOf – matched ${matchCount} schemas`, {
        code: "ONEOF_VIOLATION",
        category: "SCHEMA_VIOLATION",
        schemaPath: `${schemaPath}/oneOf`,
        title: "Value must match exactly one schema",
        expectedValue: "exactly 1 match",
        actualValue: `${matchCount} matches`,
      })
    );
  }
}

// -------------------------------------------------------------------------
// Custom Amazon vocabulary – warn only
// -------------------------------------------------------------------------

function handleCustomVocabulary(schema, path) {
  const customKeywords = [
    "editable",
    "hidden",
    "enumNames",
    "maxUtf8ByteLength",
    "maxLengthUtf8", // some schemas use variants
  ];
  for (const key of customKeywords) {
    if (schema[key] !== undefined) {
      //TODO: Commented out for now to avoid console.warn
      //   console.warn(`Custom keyword "${key}" found at ${path} – not enforced.`);
    }
  }
}

// -------------------------------------------------------------------------
// Exports (CommonJS & ES Module friendly)
// -------------------------------------------------------------------------


/**
 * Load and parse a JSON schema from disk synchronously (Node.js only).
 * @param {string} filePath – Absolute or relative path to *.json schema.
 * @returns {Object} Parsed schema object.
 * @throws  {Error}  If reading or parsing fails.
 */


/**
 * Convenience helper that reads the schema file from disk then validates data.
 * @param {string} filePath – Path to schema JSON file.
 * @param {*}      data     – Data to validate.
 * @param {Array<string>} variationAspects – Optional array of aspect names or paths that should be treated as having variations:true.
 *                                           Supports simple names like 'hard_disk' or nested paths like 'hard_disk.size' or 'hard_disk[*].size'
 * @returns {{valid:boolean,errors:Array<{path:string,message:string}>}}
 */


// Utility to get JSON type label (string,array,object,number,integer,boolean,null)
function getJsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return typeof value; // string, boolean, object, undefined, function
}

// -------------------------------------------------------------------------
// Error creation helper
// -------------------------------------------------------------------------

/**
 * Create a standardized error object with enhanced metadata.
 * @param {string} path - The data path where error occurred
 * @param {string} message - Primary error message
 * @param {Object} options - Additional error details
 * @param {string} [options.title] - Human-readable title from schema
 * @param {string} [options.severity] - ERROR, WARNING, INFO
 * @param {string} [options.code] - Error code (e.g., "90220", "MISSING_ATTRIBUTE")
 * @param {string} [options.category] - Error category
 * @param {string} [options.schemaPath] - Path in schema where rule is defined
 * @param {*} [options.actualValue] - The actual value that failed
 * @param {*} [options.expectedValue] - What was expected
 * @returns {Object} Enhanced error object
 */
function createError(path, message, options = {}) {
  const error = {
    path,
    message,
    severity: options.severity || "ERROR",
    code: options.code || "VALIDATION_ERROR",
    category: options.category || "SCHEMA_VIOLATION",
  };

  if (options.title) error.title = options.title;
  if (options.schemaPath) error.schemaPath = options.schemaPath;
  if (options.actualValue !== undefined) error.actualValue = options.actualValue;
  if (options.expectedValue !== undefined) error.expectedValue = options.expectedValue;
  if (options.attributeNames) error.attributeNames = options.attributeNames;

  return error;
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { validate, };
  // Preserve named export for ESM via package.json "type": "module" or transpiler
  module.exports.default = module.exports;
} else {
  // Browser global – file-loading helpers not exposed
  window.AmazonSchemaValidator = { validate };
}
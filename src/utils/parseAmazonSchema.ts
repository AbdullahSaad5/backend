import fs from "fs";
import path from "path";

export interface Field {
  name: string;
  title?: string;
  description?: string;
  type: string;
  required: boolean;
  enum?: string[];
  children?: Field[];
}

export function loadSchema(filePath: string): any {
  const rawData = fs.readFileSync(path.resolve(filePath), "utf-8");
  return JSON.parse(rawData);
}

export function parseSchemaProperties(properties: any, requiredFields: string[] = []): Field[] {
  const fields: Field[] = [];

  for (const [fieldName, propDef] of Object.entries<any>(properties)) {
    const field: Field = {
      name: fieldName,
      title: propDef.title || "",
      description: propDef.description || "",
      type: propDef.type || "string",
      required: requiredFields.includes(fieldName),
    };

    // Handle enums
    if (propDef.enum) {
      field.enum = propDef.enum;
    }

    // Handle nested object in array items
    if (field.type === "array" && propDef.items?.type === "object") {
      field.children = parseSchemaProperties(propDef.items.properties, propDef.items.required || []);
    }

    fields.push(field);
  }

  return fields;
}

export function extractSchemaFields(schemaPath: string): Field[] {
  const schema = loadSchema(schemaPath);
  const properties = schema.properties || {};
  const requiredFields = schema.required || [];
  return parseSchemaProperties(properties, requiredFields);
}

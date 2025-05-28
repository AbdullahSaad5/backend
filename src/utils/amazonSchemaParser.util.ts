// class AmazonSchemaParser {
//   constructor() {
//     this.parsedSchema = null;
//     this.frontendFields = [];
//     this.validationRules = {};
//     this.conditionalLogic = {};
//   }

//   /**
//    * Main method to parse Amazon SP-API schema
//    * @param {Object} schema - Raw Amazon SP-API schema
//    * @returns {Object} Parsed schema with frontend fields and form configuration
//    */
//   parseSchema(schema) {
//     try {
//       this.parsedSchema = this.normalizeSchema(schema);
//       this.extractFields(this.parsedSchema);
//       this.extractValidations(this.parsedSchema);
//       this.extractConditionalLogic(this.parsedSchema);

//       return this.generateFormConfiguration();
//     } catch (error) {
//       throw new Error(`Schema parsing failed: ${error.message}`);
//     }
//   }

//   /**
//    * Normalize the schema structure
//    * @param {Object} schema - Raw schema
//    * @returns {Object} Normalized schema
//    */
//   normalizeSchema(schema) {
//     // Handle different schema formats (OpenAPI, JSON Schema, etc.)
//     if (schema.components && schema.components.schemas) {
//       return schema.components.schemas;
//     }

//     if (schema.definitions) {
//       return schema.definitions;
//     }

//     if (schema.properties) {
//       return { root: schema };
//     }

//     return schema;
//   }

//   /**
//    * Extract fields from schema
//    * @param {Object} schema - Normalized schema
//    */
//   extractFields(schema, parentPath = '') {
//     Object.keys(schema).forEach(schemaName => {
//       const schemaObj = schema[schemaName];

//       if (schemaObj.type === 'object' && schemaObj.properties) {
//         this.processObjectProperties(schemaObj.properties, schemaObj.required || [], parentPath);
//       } else if (schemaObj.allOf) {
//         this.processAllOf(schemaObj.allOf, parentPath);
//       } else if (schemaObj.oneOf) {
//         this.processOneOf(schemaObj.oneOf, parentPath);
//       }
//     });
//   }

//   /**
//    * Process object properties
//    * @param {Object} properties - Schema properties
//    * @param {Array} required - Required field names
//    * @param {string} parentPath - Parent field path
//    */
//   processObjectProperties(properties, required = [], parentPath = '') {
//     Object.keys(properties).forEach(fieldName => {
//       const field = properties[fieldName];
//       const fieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

//       const frontendField = {
//         name: fieldName,
//         path: fieldPath,
//         type: this.mapFieldType(field),
//         label: this.generateLabel(fieldName, field),
//         required: required.includes(fieldName),
//         description: field.description || '',
//         placeholder: this.generatePlaceholder(field),
//         ...this.extractFieldConstraints(field)
//       };

//       // Handle nested objects
//       if (field.type === 'object' && field.properties) {
//         frontendField.type = 'group';
//         frontendField.fields = [];
//         this.processObjectProperties(field.properties, field.required || [], fieldPath);
//       }

//       // Handle arrays
//       if (field.type === 'array') {
//         frontendField.items = this.processArrayItems(field.items, fieldPath);
//       }

//       // Handle enums
//       if (field.enum) {
//         frontendField.options = field.enum.map(value => ({
//           value,
//           label: this.formatEnumLabel(value)
//         }));
//       }

//       this.frontendFields.push(frontendField);
//     });
//   }

//   /**
//    * Process allOf schema composition
//    * @param {Array} allOfSchemas - Array of schemas to combine
//    * @param {string} parentPath - Parent field path
//    */
//   processAllOf(allOfSchemas, parentPath) {
//     allOfSchemas.forEach(schema => {
//       if (schema.properties) {
//         this.processObjectProperties(schema.properties, schema.required || [], parentPath);
//       } else if (schema.$ref) {
//         // Handle references
//         const refSchema = this.resolveReference(schema.$ref);
//         if (refSchema && refSchema.properties) {
//           this.processObjectProperties(refSchema.properties, refSchema.required || [], parentPath);
//         }
//       }
//     });
//   }

//   /**
//    * Process oneOf schema composition
//    * @param {Array} oneOfSchemas - Array of alternative schemas
//    * @param {string} parentPath - Parent field path
//    */
//   processOneOf(oneOfSchemas, parentPath) {
//     // Create a discriminator field for oneOf
//     const discriminatorField = {
//       name: `${parentPath}_type`,
//       path: `${parentPath}_type`,
//       type: 'select',
//       label: 'Type',
//       required: true,
//       options: oneOfSchemas.map((schema, index) => ({
//         value: index,
//         label: schema.title || `Option ${index + 1}`
//       }))
//     };

//     this.frontendFields.push(discriminatorField);

//     // Add conditional logic for each option
//     oneOfSchemas.forEach((schema, index) => {
//       if (schema.properties) {
//         const conditionalFields = [];
//         this.processObjectProperties(schema.properties, schema.required || [], parentPath);

//         this.conditionalLogic[`${parentPath}_type`] = this.conditionalLogic[`${parentPath}_type`] || {};
//         this.conditionalLogic[`${parentPath}_type`][index] = {
//           showFields: Object.keys(schema.properties).map(name =>
//             parentPath ? `${parentPath}.${name}` : name
//           )
//         };
//       }
//     });
//   }

//   /**
//    * Map schema field type to frontend component type
//    * @param {Object} field - Schema field
//    * @returns {string} Frontend component type
//    */
//   mapFieldType(field) {
//     const typeMapping = {
//       'string': this.getStringFieldType(field),
//       'number': 'number',
//       'integer': 'number',
//       'boolean': 'checkbox',
//       'array': 'array',
//       'object': 'group'
//     };

//     return typeMapping[field.type] || 'text';
//   }

//   /**
//    * Determine string field subtype
//    * @param {Object} field - String field schema
//    * @returns {string} Specific input type
//    */
//   getStringFieldType(field) {
//     if (field.enum) return 'select';
//     if (field.format === 'date') return 'date';
//     if (field.format === 'date-time') return 'datetime-local';
//     if (field.format === 'email') return 'email';
//     if (field.format === 'uri') return 'url';
//     if (field.pattern || field.maxLength > 255) return 'textarea';
//     return 'text';
//   }

//   /**
//    * Process array items
//    * @param {Object} items - Array items schema
//    * @param {string} parentPath - Parent field path
//    * @returns {Object} Processed array items configuration
//    */
//   processArrayItems(items, parentPath) {
//     if (items.type === 'object' && items.properties) {
//       const itemFields = [];
//       Object.keys(items.properties).forEach(fieldName => {
//         const field = items.properties[fieldName];
//         itemFields.push({
//           name: fieldName,
//           type: this.mapFieldType(field),
//           label: this.generateLabel(fieldName, field),
//           required: (items.required || []).includes(fieldName),
//           ...this.extractFieldConstraints(field)
//         });
//       });
//       return { type: 'object', fields: itemFields };
//     }

//     return {
//       type: this.mapFieldType(items),
//       ...this.extractFieldConstraints(items)
//     };
//   }

//   /**
//    * Extract field constraints and validations
//    * @param {Object} field - Schema field
//    * @returns {Object} Field constraints
//    */
//   extractFieldConstraints(field) {
//     const constraints = {};

//     // String constraints
//     if (field.minLength !== undefined) constraints.minLength = field.minLength;
//     if (field.maxLength !== undefined) constraints.maxLength = field.maxLength;
//     if (field.pattern) constraints.pattern = field.pattern;

//     // Numeric constraints
//     if (field.minimum !== undefined) constraints.min = field.minimum;
//     if (field.maximum !== undefined) constraints.max = field.maximum;
//     if (field.exclusiveMinimum !== undefined) constraints.exclusiveMin = field.exclusiveMinimum;
//     if (field.exclusiveMaximum !== undefined) constraints.exclusiveMax = field.exclusiveMaximum;
//     if (field.multipleOf !== undefined) constraints.step = field.multipleOf;

//     // Array constraints
//     if (field.minItems !== undefined) constraints.minItems = field.minItems;
//     if (field.maxItems !== undefined) constraints.maxItems = field.maxItems;
//     if (field.uniqueItems) constraints.uniqueItems = field.uniqueItems;

//     return constraints;
//   }

//   /**
//    * Extract validation rules from schema
//    * @param {Object} schema - Schema object
//    */
//   extractValidations(schema) {
//     this.frontendFields.forEach(field => {
//       const validations = [];

//       // Required validation
//       if (field.required) {
//         validations.push({
//           type: 'required',
//           message: `${field.label} is required`
//         });
//       }

//       // String validations
//       if (field.minLength !== undefined) {
//         validations.push({
//           type: 'minLength',
//           value: field.minLength,
//           message: `${field.label} must be at least ${field.minLength} characters`
//         });
//       }

//       if (field.maxLength !== undefined) {
//         validations.push({
//           type: 'maxLength',
//           value: field.maxLength,
//           message: `${field.label} must not exceed ${field.maxLength} characters`
//         });
//       }

//       if (field.pattern) {
//         validations.push({
//           type: 'pattern',
//           value: field.pattern,
//           message: `${field.label} format is invalid`
//         });
//       }

//       // Numeric validations
//       if (field.min !== undefined) {
//         validations.push({
//           type: 'min',
//           value: field.min,
//           message: `${field.label} must be at least ${field.min}`
//         });
//       }

//       if (field.max !== undefined) {
//         validations.push({
//           type: 'max',
//           value: field.max,
//           message: `${field.label} must not exceed ${field.max}`
//         });
//       }

//       // Array validations
//       if (field.minItems !== undefined) {
//         validations.push({
//           type: 'minItems',
//           value: field.minItems,
//           message: `${field.label} must have at least ${field.minItems} items`
//         });
//       }

//       if (field.maxItems !== undefined) {
//         validations.push({
//           type: 'maxItems',
//           value: field.maxItems,
//           message: `${field.label} must not have more than ${field.maxItems} items`
//         });
//       }

//       this.validationRules[field.path] = validations;
//     });
//   }

//   /**
//    * Extract conditional logic from schema
//    * @param {Object} schema - Schema object
//    */
//   extractConditionalLogic(schema) {
//     // Handle if/then/else conditions
//     this.frontendFields.forEach(field => {
//       const schemaField = this.findSchemaField(field.path, schema);

//       if (schemaField && schemaField.if) {
//         this.processConditionalSchema(schemaField, field.path);
//       }
//     });
//   }

//   /**
//    * Process conditional schema (if/then/else)
//    * @param {Object} schemaField - Schema field with conditions
//    * @param {string} fieldPath - Field path
//    */
//   processConditionalSchema(schemaField, fieldPath) {
//     const condition = schemaField.if;
//     const thenSchema = schemaField.then;
//     const elseSchema = schemaField.else;

//     if (condition.properties) {
//       Object.keys(condition.properties).forEach(conditionField => {
//         const conditionValue = condition.properties[conditionField];

//         if (!this.conditionalLogic[conditionField]) {
//           this.conditionalLogic[conditionField] = {};
//         }

//         // Handle enum/const conditions
//         if (conditionValue.const !== undefined) {
//           this.conditionalLogic[conditionField][conditionValue.const] = {
//             showFields: thenSchema ? this.extractFieldsFromSchema(thenSchema) : [],
//             hideFields: elseSchema ? this.extractFieldsFromSchema(elseSchema) : [],
//             requiredFields: thenSchema && thenSchema.required ? thenSchema.required : []
//           };
//         }
//       });
//     }
//   }

//   /**
//    * Generate human-readable label from field name
//    * @param {string} fieldName - Field name
//    * @param {Object} field - Field schema
//    * @returns {string} Human-readable label
//    */
//   generateLabel(fieldName, field) {
//     if (field.title) return field.title;

//     return fieldName
//       .replace(/([A-Z])/g, ' $1')
//       .replace(/^./, str => str.toUpperCase())
//       .replace(/_/g, ' ')
//       .trim();
//   }

//   /**
//    * Generate placeholder text
//    * @param {Object} field - Field schema
//    * @returns {string} Placeholder text
//    */
//   generatePlaceholder(field) {
//     if (field.examples && field.examples.length > 0) {
//       return `e.g., ${field.examples[0]}`;
//     }

//     if (field.default !== undefined) {
//       return `Default: ${field.default}`;
//     }

//     return '';
//   }

//   /**
//    * Format enum label
//    * @param {string} value - Enum value
//    * @returns {string} Formatted label
//    */
//   formatEnumLabel(value) {
//     return value.toString()
//       .replace(/([A-Z])/g, ' $1')
//       .replace(/^./, str => str.toUpperCase())
//       .replace(/_/g, ' ')
//       .trim();
//   }

//   /**
//    * Generate final form configuration
//    * @returns {Object} Complete form configuration
//    */
//   generateFormConfiguration() {
//     return {
//       fields: this.frontendFields,
//       validations: this.validationRules,
//       conditionalLogic: this.conditionalLogic,
//       metadata: {
//         totalFields: this.frontendFields.length,
//         requiredFields: this.frontendFields.filter(f => f.required).length,
//         conditionalFields: Object.keys(this.conditionalLogic).length
//       }
//     };
//   }

//   /**
//    * Helper method to resolve schema references
//    * @param {string} ref - Reference string
//    * @returns {Object} Resolved schema
//    */
//   resolveReference(ref) {
//     // Simple reference resolver - extend as needed
//     const refPath = ref.replace('#/', '').split('/');
//     let current = this.parsedSchema;

//     for (const segment of refPath) {
//       if (current && current[segment]) {
//         current = current[segment];
//       } else {
//         return null;
//       }
//     }

//     return current;
//   }

//   /**
//    * Find schema field by path
//    * @param {string} path - Field path
//    * @param {Object} schema - Schema object
//    * @returns {Object} Schema field
//    */
//   findSchemaField(path, schema) {
//     // Implementation depends on schema structure
//     // This is a placeholder for field lookup logic
//     return null;
//   }

//   /**
//    * Extract field names from schema
//    * @param {Object} schema - Schema object
//    * @returns {Array} Field names
//    */
//   extractFieldsFromSchema(schema) {
//     if (schema.properties) {
//       return Object.keys(schema.properties);
//     }
//     return [];
//   }

//   /**
//    * Validate parsed configuration
//    * @returns {Object} Validation result
//    */
//   validateConfiguration() {
//     const errors = [];
//     const warnings = [];

//     // Check for missing required fields
//     this.frontendFields.forEach(field => {
//       if (!field.name || !field.type) {
//         errors.push(`Field missing name or type: ${JSON.stringify(field)}`);
//       }
//     });

//     // Check for circular dependencies in conditional logic
//     // Implementation for circular dependency detection

//     return {
//       isValid: errors.length === 0,
//       errors,
//       warnings
//     };
//   }
// }

// // Usage example and helper functions
// class FormGenerator {
//   /**
//    * Generate React form component from parsed schema
//    * @param {Object} formConfig - Parsed form configuration
//    * @returns {string} React component code
//    */
//   static generateReactForm(formConfig) {
//     const { fields, validations, conditionalLogic } = formConfig;

//     let componentCode = `
// import React, { useState, useEffect } from 'react';

// const GeneratedForm = () => {
//   const [formData, setFormData] = useState({});
//   const [errors, setErrors] = useState({});
//   const [visibleFields, setVisibleFields] = useState(new Set());

//   // Initialize visible fields
//   useEffect(() => {
//     const initialVisible = new Set();
//     ${fields.map(field =>
//       !conditionalLogic[field.path] ? `initialVisible.add('${field.path}');` : ''
//     ).filter(Boolean).join('\n    ')}
//     setVisibleFields(initialVisible);
//   }, []);

//   // Handle form data changes and conditional logic
//   const handleChange = (fieldPath, value) => {
//     const newFormData = { ...formData, [fieldPath]: value };
//     setFormData(newFormData);

//     // Apply conditional logic
//     ${this.generateConditionalLogicCode(conditionalLogic)}

//     // Clear errors for changed field
//     if (errors[fieldPath]) {
//       setErrors(prev => ({ ...prev, [fieldPath]: undefined }));
//     }
//   };

//   // Validation function
//   const validateField = (fieldPath, value) => {
//     const fieldValidations = ${JSON.stringify(validations)};
//     const rules = fieldValidations[fieldPath] || [];

//     for (const rule of rules) {
//       if (!this.validateRule(rule, value)) {
//         return rule.message;
//       }
//     }
//     return null;
//   };

//   const validateRule = (rule, value) => {
//     switch (rule.type) {
//       case 'required':
//         return value !== undefined && value !== null && value !== '';
//       case 'minLength':
//         return !value || value.length >= rule.value;
//       case 'maxLength':
//         return !value || value.length <= rule.value;
//       case 'pattern':
//         return !value || new RegExp(rule.value).test(value);
//       case 'min':
//         return !value || Number(value) >= rule.value;
//       case 'max':
//         return !value || Number(value) <= rule.value;
//       default:
//         return true;
//     }
//   };

//   return (
//     <form className="generated-form">
//       ${fields.map(field => this.generateFieldComponent(field)).join('\n      ')}
//     </form>
//   );
// };

// export default GeneratedForm;`;

//     return componentCode;
//   }

//   static generateFieldComponent(field) {
//     const baseProps = `
//         name="${field.name}"
//         value={formData['${field.path}'] || ''}
//         onChange={(e) => handleChange('${field.path}', e.target.value)}
//         required={${field.required}}
//         placeholder="${field.placeholder}"`;

//     switch (field.type) {
//       case 'text':
//       case 'email':
//       case 'url':
//         return `
//       {visibleFields.has('${field.path}') && (
//         <div className="form-field">
//           <label htmlFor="${field.name}">${field.label}</label>
//           <input
//             type="${field.type}"
//             id="${field.name}"${baseProps}
//           />
//           {errors['${field.path}'] && <span className="error">{errors['${field.path}']}</span>}
//         </div>
//       )}`;

//       case 'textarea':
//         return `
//       {visibleFields.has('${field.path}') && (
//         <div className="form-field">
//           <label htmlFor="${field.name}">${field.label}</label>
//           <textarea
//             id="${field.name}"${baseProps}
//           />
//           {errors['${field.path}'] && <span className="error">{errors['${field.path}']}</span>}
//         </div>
//       )}`;

//       case 'select':
//         const options = field.options || [];
//         return `
//       {visibleFields.has('${field.path}') && (
//         <div className="form-field">
//           <label htmlFor="${field.name}">${field.label}</label>
//           <select
//             id="${field.name}"${baseProps}>
//             <option value="">Select ${field.label}</option>
//             ${options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('\n            ')}
//           </select>
//           {errors['${field.path}'] && <span className="error">{errors['${field.path}']}</span>}
//         </div>
//       )}`;

//       case 'checkbox':
//         return `
//       {visibleFields.has('${field.path}') && (
//         <div className="form-field">
//           <label>
//             <input
//               type="checkbox"
//               name="${field.name}"
//               checked={formData['${field.path}'] || false}
//               onChange={(e) => handleChange('${field.path}', e.target.checked)}
//             />
//             ${field.label}
//           </label>
//           {errors['${field.path}'] && <span className="error">{errors['${field.path}']}</span>}
//         </div>
//       )}`;

//       default:
//         return `
//       {visibleFields.has('${field.path}') && (
//         <div className="form-field">
//           <label htmlFor="${field.name}">${field.label}</label>
//           <input
//             type="text"
//             id="${field.name}"${baseProps}
//           />
//           {errors['${field.path}'] && <span className="error">{errors['${field.path}']}</span>}
//         </div>
//       )}`;
//     }
//   }

//   static generateConditionalLogicCode(conditionalLogic) {
//     if (!conditionalLogic || Object.keys(conditionalLogic).length === 0) {
//       return '';
//     }

//     return `
//     const newVisibleFields = new Set(visibleFields);

//     ${Object.entries(conditionalLogic).map(([triggerField, conditions]) => `
//     // Conditional logic for ${triggerField}
//     if (newFormData['${triggerField}'] !== undefined) {
//       const triggerValue = newFormData['${triggerField}'];
//       ${Object.entries(conditions).map(([value, logic]) => `
//       if (triggerValue === '${value}') {
//         ${logic.showFields ? logic.showFields.map(field => `newVisibleFields.add('${field}');`).join('\n        ') : ''}
//         ${logic.hideFields ? logic.hideFields.map(field => `newVisibleFields.delete('${field}');`).join('\n        ') : ''}
//       }`).join('\n      ')}
//     }`).join('\n    ')}

//     setVisibleFields(newVisibleFields);`;
//   }
// }

// // Export the main classes
// export { AmazonSchemaParser, FormGenerator };

// // Example usage:
// /*
// const parser = new AmazonSchemaParser();
// const amazonSchema = {
//   // Your Amazon SP-API schema here
// };

// try {
//   const formConfig = parser.parseSchema(amazonSchema);
//   console.log('Parsed Form Configuration:', formConfig);

//   // Generate React form
//   const reactFormCode = FormGenerator.generateReactForm(formConfig);
//   console.log('Generated React Form:', reactFormCode);

//   // Validate configuration
//   const validation = parser.validateConfiguration();
//   if (!validation.isValid) {
//     console.error('Validation errors:', validation.errors);
//   }
// } catch (error) {
//   console.error('Parsing failed:', error.message);
// }
// */

import { Request, Response } from "express";

// Types for the transformed schema
interface BaseField {
  id: string;
  name: string;
  title: string;
  description?: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "enum" | "date" | "email" | "url";
  required: boolean;
  editable: boolean;
  hidden: boolean;
  examples?: string[];
  defaultValue?: any;
}

interface StringField extends BaseField {
  type: "string" | "email" | "url" | "date";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

interface NumberField extends BaseField {
  type: "number";
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
}

interface EnumField extends BaseField {
  type: "enum";
  options: Array<{
    value: string | number;
    label: string;
  }>;
}

interface ArrayField extends BaseField {
  type: "array";
  items: TransformedField;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

interface ObjectField extends BaseField {
  type: "object";
  properties: Record<string, TransformedField>;
  requiredFields: string[];
}

type TransformedField = StringField | NumberField | EnumField | ArrayField | ObjectField | BaseField;

interface ConditionalRule {
  condition: {
    field: string;
    operator: "equals" | "not_equals" | "in" | "not_in" | "exists" | "not_exists";
    value?: any;
    values?: any[];
  };
  then?: {
    requiredFields?: string[];
    hiddenFields?: string[];
    disabledFields?: string[];
  };
  else?: {
    requiredFields?: string[];
    hiddenFields?: string[];
    disabledFields?: string[];
  };
}

interface TransformedSchema {
  id: string;
  title: string;
  description?: string;
  version: string;
  fields: Record<string, TransformedField>;
  requiredFields: string[];
  conditionalRules: ConditionalRule[];
  marketplace: {
    id: string;
    name: string;
  };
  language: {
    tag: string;
    name: string;
  };
}

class AmazonSchemaParser {
  private schema: any;
  private transformedSchema: TransformedSchema;

  constructor(schema: any) {
    this.schema = schema;
    this.transformedSchema = this.initializeTransformedSchema();
  }

  private initializeTransformedSchema(): TransformedSchema {
    return {
      id: this.extractSchemaId(),
      title: this.extractTitle(),
      description: this.schema.$comment || "",
      version: "v1",
      fields: {},
      requiredFields: this.schema.required || [],
      conditionalRules: [],
      marketplace: this.extractMarketplace(),
      language: this.extractLanguage(),
    };
  }

  private extractSchemaId(): string {
    const id = this.schema.$id || "";
    const match = id.match(/\/([^\/]+)$/);
    return match ? match[1] : "unknown_schema";
  }

  private extractTitle(): string {
    const id = this.extractSchemaId();
    return id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private extractMarketplace(): { id: string; name: string } {
    const marketplaceDef = this.schema.$defs?.marketplace_id;
    if (marketplaceDef?.anyOf?.[1]?.enum) {
      return {
        id: marketplaceDef.anyOf[1].enum[0],
        name: marketplaceDef.anyOf[1].enumNames?.[0] || "Unknown Marketplace",
      };
    }
    return { id: "unknown", name: "Unknown Marketplace" };
  }

  private extractLanguage(): { tag: string; name: string } {
    const languageDef = this.schema.$defs?.language_tag;
    if (languageDef?.anyOf?.[1]?.enum) {
      return {
        tag: languageDef.anyOf[1].enum[0],
        name: languageDef.anyOf[1].enumNames?.[0] || "English",
      };
    }
    return { tag: "en", name: "English" };
  }

  public parse(): TransformedSchema {
    if (this.schema.properties) {
      this.parseProperties(this.schema.properties);
    }

    if (this.schema.allOf) {
      this.parseConditionalRules(this.schema.allOf);
    }

    return this.transformedSchema;
  }

  private parseProperties(properties: any, parentPath: string = ""): void {
    for (const [key, property] of Object.entries(properties)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      const transformedField = this.transformProperty(key, property as any, fieldPath);

      if (parentPath) {
        this.setNestedField(parentPath, key, transformedField);
      } else {
        this.transformedSchema.fields[key] = transformedField;
      }
    }
  }

  private setNestedField(parentPath: string, key: string, field: TransformedField): void {
    const pathParts = parentPath.split(".");
    let current: any = this.transformedSchema.fields;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (i === pathParts.length - 1) {
        if (current[part] && current[part].type === "object") {
          (current[part] as ObjectField).properties[key] = field;
        }
      } else {
        current = current[part];
        if (!current) return;
        if (current.type === "object") {
          current = current.properties;
        } else if (current.type === "array") {
          current = current.items;
          if (current.type === "object") {
            current = current.properties;
          }
        }
      }
    }
  }

  private transformProperty(key: string, property: any, fieldPath: string): TransformedField {
    if (!property || typeof property !== "object") {
      throw new Error(`Invalid or undefined property for key "${key}" at path "${fieldPath}"`);
    }

    const isRequired = this.transformedSchema.requiredFields.includes(key) || this.isRequiredInParent(fieldPath);

    const baseField: Partial<BaseField> = {
      id: fieldPath,
      name: key,
      title: property.title ?? this.humanizeFieldName(key),
      description: property.description ?? "",
      required: isRequired,
      editable: property.editable !== false,
      hidden: property.hidden === true,
      examples: property.examples,
      defaultValue: property.default,
    };

    // Handle enums first
    if (property.enum || property.anyOf?.some((item: any) => item.enum)) {
      return this.transformEnumField(baseField, property);
    }

    switch (property.type) {
      case "array":
        return this.transformArrayField(baseField, property, fieldPath);
      case "object":
        return this.transformObjectField(baseField, property, fieldPath);
      case "string":
      case "number":
      case "boolean":
      case "integer":
        return this.transformBasicField(baseField, property);
      default:
        return this.transformBasicField(baseField, property);
    }
  }

  // Helper: check if field is required by its parent object
  private isRequiredInParent(fieldPath: string): boolean {
    const parts = fieldPath.split(".");
    if (parts.length <= 1) return false;

    let currentSchema = this.schema;
    for (let i = 0; i < parts.length - 1; i++) {
      currentSchema = currentSchema.properties?.[parts[i]];
      if (!currentSchema) return false;
    }
    const lastPart = parts[parts.length - 1];
    return currentSchema?.required?.includes(lastPart) ?? false;
  }

  private transformArrayField(baseField: Partial<BaseField>, property: any, fieldPath: string): ArrayField {
    const items = property.items
      ? this.transformProperty("item", property.items, `${fieldPath}.item`)
      : ({
          type: "string",
          id: `${fieldPath}.item`,
          name: "item",
          title: "Item",
          required: false,
          editable: true,
          hidden: false,
        } as TransformedField);

    return {
      ...baseField,
      type: "array",
      items,
      minItems: property.minItems,
      maxItems: property.maxItems || property.maxUniqueItems,
      uniqueItems: property.uniqueItems || property.minUniqueItems > 0,
    } as ArrayField;
  }

  private transformObjectField(baseField: Partial<BaseField>, property: any, fieldPath: string): ObjectField {
    const objectField: ObjectField = {
      ...baseField,
      type: "object",
      properties: {},
      requiredFields: property.required || [],
    }as ObjectField;

    if (property.properties) {
      this.parseProperties(property.properties, fieldPath);
    }

    return objectField;
  }

  private transformEnumField(baseField: Partial<BaseField>, property: any): EnumField {
    let options: Array<{ value: string | number; label: string }> = [];

    if (property.enum && property.enumNames) {
      options = property.enum.map((value: any, index: number) => ({
        value,
        label: property.enumNames[index] || value,
      }));
    } else if (property.enum) {
      options = property.enum.map((value: any) => ({
        value,
        label: this.humanizeFieldName(value.toString()),
      }));
    } else if (property.anyOf) {
      const enumItem = property.anyOf.find((item: any) => item.enum);
      if (enumItem) {
        options = enumItem.enum.map((value: any, index: number) => ({
          value,
          label: enumItem.enumNames?.[index] || this.humanizeFieldName(value.toString()),
        }));
      }
    }

    return {
      ...baseField,
      type: "enum",
      options,
    } as EnumField;
  }

  private transformBasicField(baseField: Partial<BaseField>, property: any): TransformedField {
    const type = this.determineFieldType(property);

    const field: any = {
      ...baseField,
      type,
    };

    // Add string-specific validations
    if (["string", "email", "url", "date"].includes(type)) {
      if (property.minLength !== undefined) field.minLength = property.minLength;
      if (property.maxLength !== undefined) field.maxLength = property.maxLength;
      if (property.pattern) field.pattern = property.pattern;
      if (property.format) field.format = property.format;
    }

    // Add number-specific validations
    if (type === "number") {
      if (property.minimum !== undefined) field.minimum = property.minimum;
      if (property.maximum !== undefined) field.maximum = property.maximum;
      if (property.multipleOf !== undefined) field.multipleOf = property.multipleOf;
    }

    return field as TransformedField;
  }

  private determineFieldType(property: any): string {
    if (property.format) {
      switch (property.format) {
        case "date":
        case "date-time":
          return "date";
        case "email":
          return "email";
        case "uri":
        case "url":
          return "url";
      }
    }

    if (property.type === "integer") return "number";

    return property.type || "string";
  }

  private parseConditionalRules(allOf: any[]): void {
    for (const rule of allOf) {
      if (rule.if && rule.then) {
        const conditionalRule = this.transformConditionalRule(rule);
        if (conditionalRule) {
          this.transformedSchema.conditionalRules.push(conditionalRule);
        }
      }
    }
  }

  private transformConditionalRule(rule: any): ConditionalRule | null {
    try {
      const condition = this.parseCondition(rule.if);
      if (!condition) return null;

      const conditionalRule: ConditionalRule = { condition };

      if (rule.then) {
        conditionalRule.then = this.parseRuleAction(rule.then);
      }

      if (rule.else) {
        conditionalRule.else = this.parseRuleAction(rule.else);
      }

      return conditionalRule;
    } catch (error) {
      console.warn("Failed to parse conditional rule:", error);
      return null;
    }
  }

  private parseCondition(ifCondition: any): ConditionalRule["condition"] | null {
        // Handle anyOf conditions
        if (ifCondition.anyOf) {
             // For now, we'll handle the first condition in anyOf
      // This can be enhanced to handle complex OR conditions
      return this.parseCondition(ifCondition.anyOf[0]);
    }
    // Handle allOf conditions
    if (ifCondition.allOf) {
         // For now, we'll handle the first condition in allOf
      // This can be enhanced to handle complex AND conditions
      return this.parseCondition(ifCondition.allOf[0]);
    }
 // Handle not conditions
    if (ifCondition.not) {
      const innerCondition = this.parseCondition(ifCondition.not);
      if (innerCondition) {
        return {
          ...innerCondition,
          operator: innerCondition.operator === "exists" ? "not_exists" : "not_equals",
        };
      }
    }

      // Handle required field conditions
    if (ifCondition.required && Array.isArray(ifCondition.required)) {
      return {
        field: ifCondition.required[0],
        operator: "exists",
      };
    }
 // Handle property value conditions
    if (ifCondition.properties) {
      const fieldName = Object.keys(ifCondition.properties)[0];
      const fieldCondition = ifCondition.properties[fieldName];

      if (fieldCondition.contains?.properties?.value?.enum) {
        return {
          field: fieldName,
          operator: "equals",
          value: fieldCondition.contains.properties.value.enum[0],
        };
      }

      if (fieldCondition.items?.required) {
        return {
          field: fieldName,
          operator: "exists",
        };
      }
    }

    return null;
  }

  private parseRuleAction(action: any): ConditionalRule["then"] {
    const result: ConditionalRule["then"] = {};

    if (action.required && Array.isArray(action.required)) {
      result.requiredFields = action.required;
    }

    if (action.properties) {
      if (action.properties.hidden) {
        result.hiddenFields = Object.keys(action.properties.hidden);
      }
      if (action.properties.disabled) {
        result.disabledFields = Object.keys(action.properties.disabled);
      }
    }

    return result;
  }

  private humanizeFieldName(name: string): string {
    return name
      .replace(/[_-]/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  }
}

// Express route handler
export const parseAmazonSchema = async (req: Request, res: Response) => {
  try {
    const { schema } = req.body;

    if (!schema) {
      return res.status(400).json({
        success: false,
        message: "Schema is required in request body",
      });
    }

    const parser = new AmazonSchemaParser(schema);
    const transformedSchema = parser.parse();

    res.json({
      success: true,
      data: transformedSchema,
      message: "Schema parsed and transformed successfully",
    });
  } catch (error) {
    console.error("Schema parsing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to parse schema",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Utility function export (optional)
export const validateTransformedSchema = (schema: TransformedSchema): boolean => {
  try {
    // Basic validation checks
    if (!schema.id || !schema.title) {
      throw new Error("Schema must have id and title");
    }

    if (!schema.fields || Object.keys(schema.fields).length === 0) {
      throw new Error("Schema must have at least one field");
    }

    // Validate each field
    for (const [key, field] of Object.entries(schema.fields)) {
      if (!field.id || !field.name || !field.type) {
        throw new Error(`Field ${key} is missing required properties`);
      }
    }

    return true;
  } catch (error) {
    console.error("Schema validation error:", error);
    return false;
  }
};

// Helper function to save schema to database (implement based on your DB choice)
export const saveSchemaToDatabase = async (schema: TransformedSchema) => {
  // Implement your database save logic here
  // This could be MongoDB, PostgreSQL, etc.

  if (!validateTransformedSchema(schema)) {
    throw new Error("Invalid schema structure");
  }

  // Example structure for saving:
  const schemaDocument = {
    id: schema.id,
    title: schema.title,
    description: schema.description,
    version: schema.version,
    fields: schema.fields,
    requiredFields: schema.requiredFields,
    conditionalRules: schema.conditionalRules,
    marketplace: schema.marketplace,
    language: schema.language,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to your database
  console.log("Schema ready for database:", schemaDocument);

  return schemaDocument;
};

export { AmazonSchemaParser, TransformedSchema, TransformedField };


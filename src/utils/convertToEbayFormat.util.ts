import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

export const convertToEbayFormat = {
  /**
   * Field mapping configuration for Amazon to eBay conversion
   * Each mapping defines how to extract Amazon's complex structure into eBay's simple format
   */
  fieldMappings: {
    // Basic product info - convert to simple strings
    manufacturer: {
      ebayField: "manufacturer",
      converter: (data: Map<string, any>) => {
        const manufacturer = data.get("manufacturer");
        if (!manufacturer) return "";
        return Array.isArray(manufacturer) ? manufacturer[0]?.value || "" : manufacturer;
      },
    },

    model_name: {
      ebayField: "model",
      converter: (data: Map<string, any>) => {
        const model_name = data.get("model_name");
        if (!model_name) return "";
        return Array.isArray(model_name) ? model_name[0]?.value || "" : model_name;
      },
    },

    model_number: {
      ebayField: "model_number",
      converter: (data: Map<string, any>) => {
        const model_number = data.get("model_number");
        if (!model_number) return "";
        return Array.isArray(model_number) ? model_number[0]?.value || "" : model_number;
      },
    },

    color: {
      ebayField: "colour",
      converter: (data: Map<string, any>) => {
        const color = data.get("color");
        if (!color) return "";
        return Array.isArray(color) ? color[0]?.value || "" : color;
      },
    },

    condition_type: {
      ebayField: "Condition",
      converter: (data: Map<string, any>) => {
        const condition_type = data.get("condition_type");
        if (!condition_type) return "";
        return Array.isArray(condition_type) ? condition_type[0]?.value || "" : condition_type;
      },
    },

    country_of_origin: {
      ebayField: "country_region_of_manufacture",
      converter: (data: Map<string, any>) => {
        const country_of_origin = data.get("country_of_origin");
        if (!country_of_origin) return "";
        return Array.isArray(country_of_origin) ? country_of_origin[0]?.value || "" : country_of_origin;
      },
    },

    // Weight - convert to simple string with unit
    item_weight: {
      ebayField: "item_weight",
      converter: (data: Map<string, any>) => {
        const item_weight = data.get("item_weight");
        if (!item_weight || !Array.isArray(item_weight) || item_weight.length === 0) return "";
        const weight = item_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },

    item_display_weight: {
      ebayField: "weight",
      converter: (data: Map<string, any>) => {
        const item_display_weight = data.get("item_display_weight");
        if (!item_display_weight || !Array.isArray(item_display_weight) || item_display_weight.length === 0) return "";
        const weight = item_display_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },
    merchant_release_date: {
      ebayField: "release_year",
      converter: (data: Map<string, any>) => {
        const merchant_release_date = data.get("merchant_release_date");
        if (!merchant_release_date || !Array.isArray(merchant_release_date) || merchant_release_date.length === 0)
          return "";
        const graphics = merchant_release_date[0];
        return `${graphics.value}`;
      },
    },

    // Dimensions - map to multiple eBay fields (Item Length, Item Width, Item Thickness)
    item_length_width_thickness: {
      ebayField: "Dimensions",
      converter: (data: Map<string, any>) => {
        const item_length_width_thickness = data.get("item_length_width_thickness");
        if (
          !item_length_width_thickness ||
          !Array.isArray(item_length_width_thickness) ||
          item_length_width_thickness.length === 0
        )
          return {};

        const dims = item_length_width_thickness[0];
        const result: { [key: string]: string } = {};

        if (dims.length) {
          result["Item_Length"] = `${dims.length.value}${dims.length.unit}`;
        }
        if (dims.width) {
          result["Item_Width"] = `${dims.width.value}${dims.width.unit}`;
        }
        if (dims.thickness) {
          result["Item_Thickness"] = `${dims.thickness.value}${dims.thickness.unit}`;
        }

        return result;
      },
    },

    // Display size - extract only size as simple string
    display: {
      ebayField: "screen_size",
      converter: (data: Map<string, any>) => {
        const display = data.get("display");
        if (!display || !Array.isArray(display) || display.length === 0) return "";
        const displayData = display[0];
        if (displayData.size && Array.isArray(displayData.size) && displayData.size.length > 0) {
          return `${displayData.size[0].value} ${displayData.size[0].unit}`;
        }
        return "";
      },
    },

    flash_memory: {
      ebayField: "flash_memory",
      converter: (data: Map<string, any>) => {
        const flashMemory = data.get("flash_memory");
        if (!flashMemory || !Array.isArray(flashMemory) || flashMemory.length === 0) return "";
        const displayData = flashMemory[0];
        if (
          displayData.installed_size &&
          Array.isArray(displayData.installed_size) &&
          displayData.installed_size.length > 0
        ) {
          return `${displayData.installed_size[0].value} ${displayData.installed_size[0].unit}`;
        }
        return "";
      },
    },

    // Display resolution
    display_resolution: {
      ebayField: "maximum_resolution",
      converter: (data: Map<string, any>) => {
        const display = data.get("display");
        if (!display || !Array.isArray(display) || display.length === 0) return "";
        const displayData = display[0];
        if (
          displayData.resolution_maximum &&
          Array.isArray(displayData.resolution_maximum) &&
          displayData.resolution_maximum.length > 0
        ) {
          return displayData.resolution_maximum[0].value || "";
        }
        return "";
      },
    },

    // Memory capacity - convert to simple string
    memory_storage_capacity: {
      ebayField: "hard_drive_capacity",
      converter: (data: Map<string, any>) => {
        const memory_storage_capacity = data.get("memory_storage_capacity");
        if (!memory_storage_capacity || !Array.isArray(memory_storage_capacity) || memory_storage_capacity.length === 0)
          return "";
        const memory = memory_storage_capacity[0];
        return `${memory.value} ${memory.unit}`;
      },
    },
    graphics_coprocessor: {
      ebayField: "gpu",
      converter: (data: Map<string, any>) => {
        const graphics_coprocessor = data.get("graphics_coprocessor");
        if (!graphics_coprocessor || !Array.isArray(graphics_coprocessor) || graphics_coprocessor.length === 0)
          return "";
        const graphics = graphics_coprocessor[0];
        return `${graphics.value} ${graphics.unit}`;
      },
    },
    processor_description: {
      ebayField: "processor",
      converter: (data: Map<string, any>) => {
        const processor_description = data.get("processor_description");
        if (!processor_description || !Array.isArray(processor_description) || processor_description.length === 0)
          return "";
        const graphics = processor_description[0];
        return `${graphics.value}`;
      },
    },

    connectivity_technology: {
      ebayField: "connectivity",
      converter: (data: Map<string, any>) => {
        const connectivity_technology = data.get("connectivity_technology");
        if (!connectivity_technology || !Array.isArray(connectivity_technology) || connectivity_technology.length === 0)
          return "";
        const graphics = connectivity_technology[0];
        return `${graphics.value}`;
      },
    },

    // SSD capacity - convert to simple string
    solid_state_storage_drive: {
      ebayField: "ssd_capacity",
      converter: (data: Map<string, any>) => {
        const solid_state_storage_drive = data.get("solid_state_storage_drive");
        if (
          !solid_state_storage_drive ||
          !Array.isArray(solid_state_storage_drive) ||
          solid_state_storage_drive.length === 0
        )
          return "";
        const ssd = solid_state_storage_drive[0];
        return `${ssd.capacity.value} ${ssd.capacity.unit}`;
      },
    },

    // RAM size - convert to simple string
    ram_memory: {
      ebayField: "ram_size",
      converter: (data: Map<string, any>) => {
        const ram_memory = data.get("ram_memory");
        if (!ram_memory || !Array.isArray(ram_memory) || ram_memory.length === 0) return "";
        const ram = ram_memory[0];
        if (ram.installed_size && Array.isArray(ram.installed_size) && ram.installed_size.length > 0) {
          return `${ram.installed_size[0].value} ${ram.installed_size[0].unit}`;
        }
        return "";
      },
    },

    // CPU - combine into simple processor string
    cpu_model: {
      ebayField: "processor_speed",
      converter: (data: Map<string, any>) => {
        const cpu_model = data.get("cpu_model");
        if (!cpu_model || !Array.isArray(cpu_model) || cpu_model.length === 0) return "";
        const cpu = cpu_model[0];

        const manufacturer = cpu.manufacturer?.[0]?.value || "";
        const family = cpu.family?.[0]?.value || "";
        const model = cpu.model_number?.[0]?.value || "";
        const generation = cpu.generation?.[0]?.value || "";

        return `${manufacturer} ${generation} ${family} ${model}`.trim().replace(/\s+/g, " ");
      },
    },

    // Graphics - convert to simple string
    graphics_description: {
      ebayField: "graphics_processing_type",
      converter: (data: Map<string, any>) => {
        const graphics_description = data.get("graphics_description");
        if (!graphics_description) return "";
        return Array.isArray(graphics_description) ? graphics_description[0]?.value || "" : graphics_description;
      },
    },

    graphics_processor_manufacturer: {
      ebayField: "gpu_manufacturer",
      converter: (data: Map<string, any>) => {
        const graphics_processor_manufacturer = data.get("graphics_processor_manufacturer");
        if (!graphics_processor_manufacturer) return "";
        return Array.isArray(graphics_processor_manufacturer)
          ? graphics_processor_manufacturer[0]?.value || ""
          : graphics_processor_manufacturer;
      },
    },

    // Operating System - convert to simple string
    operating_system: {
      ebayField: "operating_system",
      converter: (data: Map<string, any>) => {
        const operating_system = data.get("operating_system");
        if (!operating_system) return "";
        return Array.isArray(operating_system) ? operating_system[0]?.value || "" : operating_system;
      },
    },

    // Warranty - convert to simple string
    warranty_description: {
      ebayField: "manufacturer_warranty",
      converter: (data: Map<string, any>) => {
        const warranty_description = data.get("warranty_description");
        if (!warranty_description) return "";
        return Array.isArray(warranty_description) ? warranty_description[0]?.value || "" : warranty_description;
      },
    },

    // Features - convert to array of strings
    special_feature: {
      ebayField: "features",
      converter: (data: Map<string, any>) => {
        const special_feature = data.get("special_feature");
        if (!special_feature || !Array.isArray(special_feature)) return [];
        return special_feature.map((item: any) => item.value || item);
      },
    },

    // Keywords - convert to simple string
    generic_keyword: {
      ebayField: "keywords",
      converter: (data: Map<string, any>) => {
        const generic_keyword = data.get("generic_keyword");
        if (!generic_keyword) return "";
        return Array.isArray(generic_keyword) ? generic_keyword[0]?.value || "" : generic_keyword;
      },
    },

    // Max order quantity - convert to simple string/number
    // max_order_quantity: {
    //   ebayField: "max_order_quantity",
    //   converter: (data: Map<string, any>) => {
    //     const max_order_quantity = data.get("max_order_quantity");
    //     if (!max_order_quantity) return "";
    //     return Array.isArray(max_order_quantity) ? max_order_quantity[0]?.value || "" : max_order_quantity;
    //   },
    // },
  },

  /**
   * Fields to ignore (Amazon-specific or irrelevant for eBay)
   */
  ignoredFields: new Set([
    "merchant_suggested_asin",
    "gdpr_risk",
    "supplier_declared_has_product_identifier_exemption",
    "fulfillment_availability",
    "supplier_declared_dg_hz_regulation",
    "purchasable_offer",
    "$__parent",
    "$__path",
    "$__schemaType",
  ]),

  /**
   * Convert snake_case or camelCase to Title Case for eBay field names
   * @param {string} fieldName - The Amazon field name
   */
  toTitleCase: (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  },

  /**
   * Dynamic converter for unmapped fields
   * @param {Map<string, any>} data - The Amazon product data
   * @param {string} fieldName - The Amazon field name
   */
  dynamicFieldConverter: (data: Map<string, any>, fieldName: string) => {
    const value = data.get(fieldName);
    if (!value) return "";

    // Handle array of objects with value/unit
    if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === "object") {
      const item = value[0];
      if (item.value && item.unit) {
        return `${item.value} ${item.unit}`;
      }
      if (item.value) {
        return item.value;
      }
      if (item.capacity && item.capacity.value && item.capacity.unit) {
        return `${item.capacity.value} ${item.capacity.unit}`;
      }
    }

    // Handle simple array of values
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }

    // Handle simple string or number
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }

    return "";
  },

  /**
   * Check if a field exists in the field mappings
   * @param {string} fieldName - The Amazon field name to check
   */
  hasFieldMapping: (fieldName: string) => {
    return fieldName in convertToEbayFormat.fieldMappings;
  },

  /**
   * Convert a specific Amazon field to eBay format
   * @param {Map<string, any>} prodData - The Amazon product data
   * @param {string} amazonFieldName - The Amazon field name to convert
   */
  convertField: (prodData: Map<string, any>, amazonFieldName: string) => {
    const mapping =
      convertToEbayFormat.fieldMappings[amazonFieldName as keyof typeof convertToEbayFormat.fieldMappings];

    if (!mapping) {
      console.warn(`No mapping found for Amazon field: ${amazonFieldName}`);
      return "";
    }

    try {
      return mapping.converter(prodData);
    } catch (error) {
      console.error(`Error converting field ${amazonFieldName}:`, error);
      return "";
    }
  },

  /**
   * Transform entire Amazon prodTechInfo to eBay format
   * @param {Map<string, any>} prodData - The Amazon product technical information
   * @returns {Object} - eBay-compatible data with simple strings/arrays
   */
  transformProdTechInfo: (prodData: Map<string, any>) => {
    // console.log("Converting Amazon data to eBay format:", prodData);
    const ebayData: any = {};

    for (const amazonFieldName of prodData.keys()) {
      // Skip ignored fields
      if (convertToEbayFormat.ignoredFields.has(amazonFieldName)) {
        console.log(`Amazon field '${amazonFieldName}' is ignored, skipping...`);
        continue;
      }

      if (convertToEbayFormat.hasFieldMapping(amazonFieldName)) {
        // Handle explicit mappings
        const mapping =
          convertToEbayFormat.fieldMappings[amazonFieldName as keyof typeof convertToEbayFormat.fieldMappings];
        const ebayValue = convertToEbayFormat.convertField(prodData, amazonFieldName);

        if (typeof ebayValue === "object" && !Array.isArray(ebayValue) && ebayValue !== null) {
          Object.assign(ebayData, ebayValue);
        } else if (ebayValue !== "" && ebayValue !== null && ebayValue !== undefined) {
          if (Array.isArray(ebayValue) && ebayValue.length === 0) {
            continue;
          }
          ebayData[mapping.ebayField] = ebayValue;
        }
      } else {
        // Handle unmapped fields dynamically
        const ebayValue = convertToEbayFormat.dynamicFieldConverter(prodData, amazonFieldName);
        if (ebayValue !== "" && ebayValue !== null && ebayValue !== undefined) {
          const ebayFieldName = convertToEbayFormat.toTitleCase(amazonFieldName);
          ebayData[ebayFieldName] = ebayValue;
          console.log(`Dynamically mapped Amazon field '${amazonFieldName}' to eBay field '${ebayFieldName}'`);
        } else {
          console.log(`Amazon field '${amazonFieldName}' has no valid value, skipping...`);
        }
      }
    }

    // console.log("Converted eBay data:", ebayData);
    return ebayData;
  },

  /**
   * Get all available eBay field names from mappings
   */
  getEbayFieldNames: () => {
    return Object.values(convertToEbayFormat.fieldMappings)
      .flatMap((mapping: any) =>
        mapping.ebayField === "Dimensions" ? ["Item Length", "Item Width", "Item Thickness"] : mapping.ebayField
      )
      .filter((field: string) => field);
  },

  /**
   * Get all available Amazon field names from mappings
   */
  getAmazonFieldNames: () => {
    return Object.keys(convertToEbayFormat.fieldMappings);
  },
};

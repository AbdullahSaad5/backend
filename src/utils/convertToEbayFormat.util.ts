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
      ebayField: "Manufacturer",
      converter: (data: any) => {
        if (!data.manufacturer) return "";
        return Array.isArray(data.manufacturer) ? data.manufacturer[0]?.value || "" : data.manufacturer;
      },
    },

    model_name: {
      ebayField: "Model",
      converter: (data: any) => {
        if (!data.model_name) return "";
        return Array.isArray(data.model_name) ? data.model_name[0]?.value || "" : data.model_name;
      },
    },

    model_number: {
      ebayField: "Model Number",
      converter: (data: any) => {
        if (!data.model_number) return "";
        return Array.isArray(data.model_number) ? data.model_number[0]?.value || "" : data.model_number;
      },
    },

    color: {
      ebayField: "Colour",
      converter: (data: any) => {
        if (!data.color) return "";
        return Array.isArray(data.color) ? data.color[0]?.value || "" : data.color;
      },
    },

    condition_type: {
      ebayField: "Condition",
      converter: (data: any) => {
        if (!data.condition_type) return "";
        return Array.isArray(data.condition_type) ? data.condition_type[0]?.value || "" : data.condition_type;
      },
    },

    country_of_origin: {
      ebayField: "Country/Region of Manufacture",
      converter: (data: any) => {
        if (!data.country_of_origin) return "";
        return Array.isArray(data.country_of_origin) ? data.country_of_origin[0]?.value || "" : data.country_of_origin;
      },
    },

    // Weight - convert to simple string with unit
    item_weight: {
      ebayField: "Weight",
      converter: (data: any) => {
        if (!data.item_weight || !Array.isArray(data.item_weight) || data.item_weight.length === 0) return "";
        const weight = data.item_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },

    item_display_weight: {
      ebayField: "Display Weight",
      converter: (data: any) => {
        if (
          !data.item_display_weight ||
          !Array.isArray(data.item_display_weight) ||
          data.item_display_weight.length === 0
        )
          return "";
        const weight = data.item_display_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },

    // Dimensions - convert to simple string
    item_length_width_thickness: {
      ebayField: "Dimensions",
      converter: (data: any) => {
        if (
          !data.item_length_width_thickness ||
          !Array.isArray(data.item_length_width_thickness) ||
          data.item_length_width_thickness.length === 0
        )
          return "";
        const dims = data.item_length_width_thickness[0];
        return `${dims.length.value}${dims.length.unit} x ${dims.width.value}${dims.width.unit} x ${dims.thickness.value}${dims.thickness.unit}`;
      },
    },

    // Display size - extract only size as simple string
    display: {
      ebayField: "Screen Size",
      converter: (data: any) => {
        if (!data.display || !Array.isArray(data.display) || data.display.length === 0) return "";
        const display = data.display[0];
        if (display.size && Array.isArray(display.size) && display.size.length > 0) {
          return `${display.size[0].value} ${display.size[0].unit}`;
        }
        return "";
      },
    },

    // Display resolution
    display_resolution: {
      ebayField: "Maximum Resolution",
      converter: (data: any) => {
        if (!data.display || !Array.isArray(data.display) || data.display.length === 0) return "";
        const display = data.display[0];
        if (
          display.resolution_maximum &&
          Array.isArray(display.resolution_maximum) &&
          display.resolution_maximum.length > 0
        ) {
          return display.resolution_maximum[0].value || "";
        }
        return "";
      },
    },

    // Memory capacity - convert to simple string
    memory_storage_capacity: {
      ebayField: "Hard Drive Capacity",
      converter: (data: any) => {
        if (
          !data.memory_storage_capacity ||
          !Array.isArray(data.memory_storage_capacity) ||
          data.memory_storage_capacity.length === 0
        )
          return "";
        const memory = data.memory_storage_capacity[0];
        return `${memory.value} ${memory.unit}`;
      },
    },

    // SSD capacity - convert to simple string
    solid_state_storage_drive: {
      ebayField: "SSD Capacity",
      converter: (data: any) => {
        if (
          !data.solid_state_storage_drive ||
          !Array.isArray(data.solid_state_storage_drive) ||
          data.solid_state_storage_drive.length === 0
        )
          return "";
        const ssd = data.solid_state_storage_drive[0];
        return `${ssd.capacity.value} ${ssd.capacity.unit}`;
      },
    },

    // RAM size - convert to simple string
    ram_memory: {
      ebayField: "RAM Size",
      converter: (data: any) => {
        if (!data.ram_memory || !Array.isArray(data.ram_memory) || data.ram_memory.length === 0) return "";
        const ram = data.ram_memory[0];
        if (ram.installed_size && Array.isArray(ram.installed_size) && ram.installed_size.length > 0) {
          return `${ram.installed_size[0].value} ${ram.installed_size[0].unit}`;
        }
        return "";
      },
    },

    // CPU - combine into simple processor string
    cpu_model: {
      ebayField: "Processor",
      converter: (data: any) => {
        if (!data.cpu_model || !Array.isArray(data.cpu_model) || data.cpu_model.length === 0) return "";
        const cpu = data.cpu_model[0];

        const manufacturer = cpu.manufacturer?.[0]?.value || "";
        const family = cpu.family?.[0]?.value || "";
        const model = cpu.model_number?.[0]?.value || "";
        const generation = cpu.generation?.[0]?.value || "";

        return `${manufacturer} ${generation} ${family} ${model}`.trim().replace(/\s+/g, " ");
      },
    },

    // CPU Speed - convert to simple string
    cpu_speed: {
      ebayField: "Processor Speed",
      converter: (data: any) => {
        if (!data.cpu_model || !Array.isArray(data.cpu_model) || data.cpu_model.length === 0) return "";
        const cpu = data.cpu_model[0];
        if (cpu.speed && Array.isArray(cpu.speed) && cpu.speed.length > 0) {
          return `${cpu.speed[0].value} ${cpu.speed[0].unit}`;
        }
        return "";
      },
    },

    // Graphics - convert to simple string
    graphics_description: {
      ebayField: "Graphics Processing Type",
      converter: (data: any) => {
        if (!data.graphics_description) return "";
        return Array.isArray(data.graphics_description)
          ? data.graphics_description[0]?.value || ""
          : data.graphics_description;
      },
    },

    graphics_processor_manufacturer: {
      ebayField: "GPU Manufacturer",
      converter: (data: any) => {
        if (!data.graphics_processor_manufacturer) return "";
        return Array.isArray(data.graphics_processor_manufacturer)
          ? data.graphics_processor_manufacturer[0]?.value || ""
          : data.graphics_processor_manufacturer;
      },
    },

    // Operating System - convert to simple string
    operating_system: {
      ebayField: "Operating System",
      converter: (data: any) => {
        if (!data.operating_system) return "";
        return Array.isArray(data.operating_system) ? data.operating_system[0]?.value || "" : data.operating_system;
      },
    },

    // Warranty - convert to simple string
    warranty_description: {
      ebayField: "Manufacturer Warranty",
      converter: (data: any) => {
        if (!data.warranty_description) return "";
        return Array.isArray(data.warranty_description)
          ? data.warranty_description[0]?.value || ""
          : data.warranty_description;
      },
    },

    // Features - convert to array of strings
    bullet_point: {
      ebayField: "Features",
      converter: (data: any) => {
        if (!data.bullet_point || !Array.isArray(data.bullet_point)) return [];
        return data.bullet_point.map((item: any) => item.value || item);
      },
    },

    // Keywords - convert to simple string
    generic_keyword: {
      ebayField: "Keywords",
      converter: (data: any) => {
        if (!data.generic_keyword) return "";
        return Array.isArray(data.generic_keyword) ? data.generic_keyword[0]?.value || "" : data.generic_keyword;
      },
    },

    // Max order quantity - convert to simple string/number
    max_order_quantity: {
      ebayField: "Max Order Quantity",
      converter: (data: any) => {
        if (!data.max_order_quantity) return "";
        return Array.isArray(data.max_order_quantity)
          ? data.max_order_quantity[0]?.value || ""
          : data.max_order_quantity;
      },
    },

    // Category - convert to simple string
    recommended_browse_nodes: {
      ebayField: "Category",
      converter: (data: any) => {
        if (!data.recommended_browse_nodes) return "";
        return Array.isArray(data.recommended_browse_nodes)
          ? data.recommended_browse_nodes[0]?.value || ""
          : data.recommended_browse_nodes;
      },
    },
  },

  /**
   * Check if a field exists in the field mappings
   * @param {string} fieldName - The Amazon field name to check
   * @returns {boolean} - Whether the field exists in mappings
   */
  hasFieldMapping: (fieldName: string) => {
    return fieldName in convertToEbayFormat.fieldMappings;
  },

  /**
   * Convert a specific Amazon field to eBay format
   * @param {Object} prodTechInfo - The Amazon product data
   * @param {string} amazonFieldName - The Amazon field name to convert
   * @returns {string|string[]|""} - The converted eBay value (string, array of strings, or empty string)
   */
  convertField: (prodTechInfo: any, amazonFieldName: string) => {
    const mapping =
      convertToEbayFormat.fieldMappings[amazonFieldName as keyof typeof convertToEbayFormat.fieldMappings];

    if (!mapping) {
      console.warn(`No mapping found for Amazon field: ${amazonFieldName}`);
      return "";
    }

    try {
      return mapping.converter(prodTechInfo);
    } catch (error) {
      console.error(`Error converting field ${amazonFieldName}:`, error);
      return "";
    }
  },

  /**
   * Transform entire Amazon prodTechInfo to eBay format
   * @param {Object} prodTechInfo - The Amazon product technical information
   * @returns {Object} - eBay-compatible data with simple strings/arrays
   */
  transformProdTechInfo: (prodTechInfo: any) => {
    console.log("Converting Amazon data to eBay format:", prodTechInfo);
    const ebayData: any = {};

    // Process each Amazon field that has a mapping
    Object.keys(prodTechInfo).forEach((amazonFieldName) => {
      if (convertToEbayFormat.hasFieldMapping(amazonFieldName)) {
        const mapping =
          convertToEbayFormat.fieldMappings[amazonFieldName as keyof typeof convertToEbayFormat.fieldMappings];
        const ebayValue = convertToEbayFormat.convertField(prodTechInfo, amazonFieldName);

        // Only add non-empty values
        if (ebayValue !== "" && ebayValue !== null && ebayValue !== undefined) {
          // For arrays, only add if not empty
          if (Array.isArray(ebayValue) && ebayValue.length === 0) {
            return;
          }

          ebayData[mapping.ebayField] = ebayValue;
        }
      } else {
        console.log(`Amazon field '${amazonFieldName}' not mapped, skipping...`);
      }
    });

    console.log("Converted eBay data:", ebayData);
    return ebayData;
  },

  /**
   * Get all available eBay field names from mappings
   * @returns {string[]} - Array of eBay field names
   */
  getEbayFieldNames: () => {
    return Object.values(convertToEbayFormat.fieldMappings).map((mapping) => mapping.ebayField);
  },

  /**
   * Get all available Amazon field names from mappings
   * @returns {string[]} - Array of Amazon field names
   */
  getAmazonFieldNames: () => {
    return Object.keys(convertToEbayFormat.fieldMappings);
  },
};

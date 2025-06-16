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
      converter: (data: Map<string, any>) => {
        const manufacturer = data.get("manufacturer");
        if (!manufacturer) return "";
        return Array.isArray(manufacturer) ? manufacturer[0]?.value || "" : manufacturer;
      },
    },

    model_name: {
      ebayField: "Model",
      converter: (data: Map<string, any>) => {
        const model_name = data.get("model_name");
        if (!model_name) return "";
        return Array.isArray(model_name) ? model_name[0]?.value || "" : model_name;
      },
    },

    model_number: {
      ebayField: "Model Number",
      converter: (data: Map<string, any>) => {
        const model_number = data.get("model_number");
        if (!model_number) return "";
        return Array.isArray(model_number) ? model_number[0]?.value || "" : model_number;
      },
    },

    color: {
      ebayField: "Colour",
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
      ebayField: "Country/Region of Manufacture",
      converter: (data: Map<string, any>) => {
        const country_of_origin = data.get("country_of_origin");
        if (!country_of_origin) return "";
        return Array.isArray(country_of_origin) ? country_of_origin[0]?.value || "" : country_of_origin;
      },
    },

    // Weight - convert to simple string with unit
    item_weight: {
      ebayField: "Weight",
      converter: (data: Map<string, any>) => {
        const item_weight = data.get("item_weight");
        if (!item_weight || !Array.isArray(item_weight) || item_weight.length === 0) return "";
        const weight = item_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },

    item_display_weight: {
      ebayField: "Display Weight",
      converter: (data: Map<string, any>) => {
        const item_display_weight = data.get("item_display_weight");
        if (!item_display_weight || !Array.isArray(item_display_weight) || item_display_weight.length === 0) return "";
        const weight = item_display_weight[0];
        return `${weight.value} ${weight.unit}`;
      },
    },

    // Dimensions - map to multiple eBay fields (Item Length, Item Width, Item Thickness)
    item_length_width_thickness: {
      ebayField: "Dimensions", // This is a placeholder; actual fields are set in converter
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
          result["Item Length"] = `${dims.length.value}${dims.length.unit}`;
        }
        if (dims.width) {
          result["Item Width"] = `${dims.width.value}${dims.width.unit}`;
        }
        if (dims.thickness) {
          result["Item Thickness"] = `${dims.thickness.value}${dims.thickness.unit}`;
        }

        return result;
      },
    },

    // Display size - extract only size as simple string
    display: {
      ebayField: "Screen Size",
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

    // Display resolution
    display_resolution: {
      ebayField: "Maximum Resolution",
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
      ebayField: "Hard Drive Capacity",
      converter: (data: Map<string, any>) => {
        const memory_storage_capacity = data.get("memory_storage_capacity");
        if (!memory_storage_capacity || !Array.isArray(memory_storage_capacity) || memory_storage_capacity.length === 0)
          return "";
        const memory = memory_storage_capacity[0];
        return `${memory.value} ${memory.unit}`;
      },
    },

    // SSD capacity - convert to simple string
    solid_state_storage_drive: {
      ebayField: "SSD Capacity",
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
      ebayField: "RAM Size",
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
      ebayField: "Processor",
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

    // CPU Speed - convert to simple string
    cpu_speed: {
      ebayField: "Processor Speed",
      converter: (data: Map<string, any>) => {
        const cpu_model = data.get("cpu_model");
        if (!cpu_model || !Array.isArray(cpu_model) || cpu_model.length === 0) return "";
        const cpu = cpu_model[0];
        if (cpu.speed && Array.isArray(cpu.speed) && cpu.speed.length > 0) {
          return `${cpu.speed[0].value} ${cpu.speed[0].unit}`;
        }
        return "";
      },
    },

    // Graphics - convert to simple string
    graphics_description: {
      ebayField: "Graphics Processing Type",
      converter: (data: Map<string, any>) => {
        const graphics_description = data.get("graphics_description");
        if (!graphics_description) return "";
        return Array.isArray(graphics_description) ? graphics_description[0]?.value || "" : graphics_description;
      },
    },

    graphics_processor_manufacturer: {
      ebayField: "GPU Manufacturer",
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
      ebayField: "Operating System",
      converter: (data: Map<string, any>) => {
        const operating_system = data.get("operating_system");
        if (!operating_system) return "";
        return Array.isArray(operating_system) ? operating_system[0]?.value || "" : operating_system;
      },
    },

    // Warranty - convert to simple string
    warranty_description: {
      ebayField: "Manufacturer Warranty",
      converter: (data: Map<string, any>) => {
        const warranty_description = data.get("warranty_description");
        if (!warranty_description) return "";
        return Array.isArray(warranty_description) ? warranty_description[0]?.value || "" : warranty_description;
      },
    },

    // Features - convert to array of strings
    bullet_point: {
      ebayField: "Features",
      converter: (data: Map<string, any>) => {
        const bullet_point = data.get("bullet_point");
        if (!bullet_point || !Array.isArray(bullet_point)) return [];
        return bullet_point.map((item: any) => item.value || item);
      },
    },

    // Keywords - convert to simple string
    generic_keyword: {
      ebayField: "Keywords",
      converter: (data: Map<string, any>) => {
        const generic_keyword = data.get("generic_keyword");
        if (!generic_keyword) return "";
        return Array.isArray(generic_keyword) ? generic_keyword[0]?.value || "" : generic_keyword;
      },
    },

    // Max order quantity - convert to simple string/number
    max_order_quantity: {
      ebayField: "Max Order Quantity",
      converter: (data: Map<string, any>) => {
        const max_order_quantity = data.get("max_order_quantity");
        if (!max_order_quantity) return "";
        return Array.isArray(max_order_quantity) ? max_order_quantity[0]?.value || "" : max_order_quantity;
      },
    },

    // Category - convert to simple string
    recommended_browse_nodes: {
      ebayField: "Category",
      converter: (data: Map<string, any>) => {
        const recommended_browse_nodes = data.get("recommended_browse_nodes");
        if (!recommended_browse_nodes) return "";
        return Array.isArray(recommended_browse_nodes)
          ? recommended_browse_nodes[0]?.value || ""
          : recommended_browse_nodes;
      },
    },
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
    console.log("Converting Amazon data to eBay format:", prodData);
    const ebayData: any = {};

    for (const amazonFieldName of prodData.keys()) {
      if (convertToEbayFormat.hasFieldMapping(amazonFieldName)) {
        const mapping =
          convertToEbayFormat.fieldMappings[amazonFieldName as keyof typeof convertToEbayFormat.fieldMappings];
        const ebayValue = convertToEbayFormat.convertField(prodData, amazonFieldName);

        // Handle special case for item_length_width_thickness returning multiple fields
        if (typeof ebayValue === "object" && !Array.isArray(ebayValue) && ebayValue !== null) {
          Object.assign(ebayData, ebayValue);
        } else if (ebayValue !== "" && ebayValue !== null && ebayValue !== undefined) {
          if (Array.isArray(ebayValue) && ebayValue.length === 0) {
            continue;
          }
          ebayData[mapping.ebayField] = ebayValue;
        }
      } else {
        console.log(`Amazon field '${amazonFieldName}' not mapped, skipping...`);
      }
    }

    console.log("Converted eBay data:", ebayData);
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

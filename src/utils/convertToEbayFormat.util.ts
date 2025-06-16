import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});
export const convertToEbayFormat = {
  /**
   * Utility function to transform complex product data structure into eBay-compatible format
   * Handles array-of-objects structure and converts to simple key-value pairs for XML generation
   */

  /**
   * Extract value from array-of-objects structure
   * @param {Array|string|number} data - The data to extract from
   * @returns {string|number|null} - Extracted value
   */
  extractValue: (data: any) => {
    // If data is already a simple value, return it
    if (!Array.isArray(data)) {
      return data;
    }

    // If empty array, return null
    if (data.length === 0) {
      return null;
    }

    // Return the first item's value
    return data[0]?.value || data[0] || null;
  },

  /**
   * Extract multiple values from array-of-objects structure
   * @param {Array} data - The array data to extract from
   * @returns {Array} - Array of extracted values
   */
  extractMultipleValues: (data: any) => {
    if (!Array.isArray(data)) {
      return [data];
    }

    return data.map((item) => item.value || item);
  },

  /**
   * Transform product data to eBay-compatible format
   * @param {Object | any} productData - The complex product data structure
   * @param {Object} options - Transformation options
   * @returns {Object} - Simplified data structure for eBay XML
   */
  transformToEbayFormat: (productData: any, options = {}) => {
    const { includeAllVariants = false }: any = options;

    const transformed: any = {};

    // Handle productInfo section
    if (productData.productInfo) {
      const info = productData.productInfo;

      // Simple fields
      transformed.sku = info.sku;

      // Extract values from array-of-objects
      transformed.title = convertToEbayFormat.extractValue(info.item_name);
      transformed.description = convertToEbayFormat.extractValue(info.product_description);
      transformed.brand = convertToEbayFormat.extractValue(info.brand);

      // Handle multiple values if needed
      if (includeAllVariants) {
        transformed.allTitles = convertToEbayFormat.extractMultipleValues(info.item_name);
        transformed.allDescriptions = convertToEbayFormat.extractMultipleValues(info.product_description);
      }
    }

    // Handle prodTechInfo section
    if (productData.prodTechInfo) {
      const techInfo = productData.prodTechInfo;

      // Basic info
      transformed.manufacturer = convertToEbayFormat.extractValue(techInfo.manufacturer);
      transformed.modelName = convertToEbayFormat.extractValue(techInfo.model_name);
      transformed.modelNumber = convertToEbayFormat.extractValue(techInfo.model_number);
      transformed.color = convertToEbayFormat.extractValue(techInfo.color);
      transformed.condition = convertToEbayFormat.extractValue(techInfo.condition_type);
      transformed.countryOfOrigin = convertToEbayFormat.extractValue(techInfo.country_of_origin);

      // Weight and dimensions
      if (techInfo.item_weight && techInfo.item_weight[0]) {
        transformed.weight = `${techInfo.item_weight[0].value} ${techInfo.item_weight[0].unit}`;
      }

      if (techInfo.item_dimensions && techInfo.item_dimensions[0]) {
        const dims = techInfo.item_dimensions[0];
        transformed.dimensions = {
          length: `${dims.length.value} ${dims.length.unit}`,
          width: `${dims.width.value} ${dims.width.unit}`,
          height: `${dims.height.value} ${dims.height.unit}`,
        };
      }

      // Memory capacity
      if (techInfo.memory_storage_capacity && techInfo.memory_storage_capacity[0]) {
        const memory = techInfo.memory_storage_capacity[0];
        transformed.memoryCapacity = `${memory.value} ${memory.unit}`;
      }

      // CPU information
      if (techInfo.cpu_model && techInfo.cpu_model[0]) {
        const cpu = techInfo.cpu_model[0];
        transformed.processor = {
          manufacturer: convertToEbayFormat.extractValue(cpu.manufacturer),
          family: convertToEbayFormat.extractValue(cpu.family),
          model: convertToEbayFormat.extractValue(cpu.model_number),
          speed: cpu.speed ? `${cpu.speed[0].value} ${cpu.speed[0].unit}` : null,
          maxSpeed: cpu.speed_maximum ? `${cpu.speed_maximum[0].value} ${cpu.speed_maximum[0].unit}` : null,
          generation: convertToEbayFormat.extractValue(cpu.generation),
          codename: convertToEbayFormat.extractValue(cpu.codename),
        };
      }

      // Display information
      if (techInfo.display && techInfo.display[0]) {
        const display = techInfo.display[0];
        transformed.display = {
          size: display.size ? `${display.size[0].value} ${display.size[0].unit}` : null,
          resolution: convertToEbayFormat.extractValue(display.resolution_maximum),
          technology: convertToEbayFormat.extractValue(display.technology),
          type: convertToEbayFormat.extractValue(display.type),
        };
      }

      // Storage information
      if (techInfo.solid_state_storage_drive && techInfo.solid_state_storage_drive[0]) {
        const storage = techInfo.solid_state_storage_drive[0];
        transformed.storage = {
          capacity: `${storage.capacity.value} ${storage.capacity.unit}`,
          formFactor: storage.form_factor,
          interface: storage.interface,
          maxReadSpeed: storage.maximum_sequential_read
            ? `${storage.maximum_sequential_read.value} ${storage.maximum_sequential_read.unit}`
            : null,
          maxWriteSpeed: storage.maximum_sequential_write
            ? `${storage.maximum_sequential_write.value} ${storage.maximum_sequential_write.unit}`
            : null,
        };
      }

      // Bullet points for features
      if (techInfo.bullet_point) {
        transformed.features = techInfo.bullet_point.map((item: any) => item.value);
      }

      // Inventory and fulfillment
      transformed.maxOrderQuantity = convertToEbayFormat.extractValue(techInfo.max_order_quantity);

      if (techInfo.fulfillment_availability) {
        transformed.inventory = techInfo.fulfillment_availability.map((item: any) => ({
          channel: item.fulfillment_channel_code,
          quantity: item.quantity,
        }));
      }

      // Keywords and categories
      transformed.keywords = convertToEbayFormat.extractValue(techInfo.generic_keyword);
      transformed.category = convertToEbayFormat.extractValue(techInfo.recommended_browse_nodes);
    }

    return transformed;
  },
};

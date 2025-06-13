import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

export const processVariationsUtility = {
  // Function to process attributes based on the category
  processAttributesByCategory: (categoryName: string, attributes: any) => {
    switch (categoryName) {
      case "NOTEBOOK_COMPUTER":
        return processVariationsUtility.processNotebookComputerAttributes(attributes);
      // Add new cases here as you add more categories in the future
      default:
        // Future categories can be handled here
        return processVariationsUtility.processOtherCategoryAttributes(attributes);
    }
  },

  // Function to process the 'NOTEBOOK_COMPUTER' category
  processNotebookComputerAttributes: (attributes: any) => {
    const processedAttributes: any = {};

    const attributesObj = attributes instanceof Map ? Object.fromEntries(attributes) : attributes;

    // Ensure display attribute exists
    if (attributesObj.display && Array.isArray(attributesObj.display)) {
      processedAttributes.display = processVariationsUtility.processDisplayAttribute(attributesObj.display);
    }
    // Processing for RAM memory (handling `installed_size`, `maximum_size`)
    if (attributesObj.ram_memory && Array.isArray(attributesObj.ram_memory)) {
      processedAttributes.ram_memory = processVariationsUtility.processRamMemory(attributesObj.ram_memory);
    }

    // Processing for processor_description (just extracting the value)
    if (attributesObj.processor_description && Array.isArray(attributesObj.processor_description)) {
      processedAttributes.processor_description = processVariationsUtility.processProcessorDescription(
        attributesObj.processor_description
      );
    }

    // Processing for solid_state_storage_drive (concatenate `capacity` values)
    if (attributesObj.solid_state_storage_drive && Array.isArray(attributesObj.solid_state_storage_drive)) {
      processedAttributes.solid_state_storage_drive = processVariationsUtility.processSolidStateStorageDrive(
        attributesObj.solid_state_storage_drive
      );
    }

    // Processing for memory_storage_capacity (concatenate `value` and `unit`)
    if (attributesObj.memory_storage_capacity && Array.isArray(attributesObj.memory_storage_capacity)) {
      processedAttributes.memory_storage_capacity = processVariationsUtility.processMemoryStorageCapacity(
        attributesObj.memory_storage_capacity
      );
    }

    // Returning the processed attributes
    return processedAttributes;
  },

  // **Placeholder for future categories**
  processOtherCategoryAttributes: (attributes: any) => {
    // Implement logic for other categories as needed.
    // For example, if there's a "smartphone" category, process its attributes differently.
    return {};
  },
  // Function to process 'display' attribute
  processDisplayAttribute: (attribute: any[]) => {
    console.log("Processing display attribute:", attribute);

    // Flatten the array to extract `size` values as a combination of value and unit
    const sizes = attribute.flatMap((item) => item.size.map((size: any) => `${size.value} ${size.unit}`));

    return sizes;
  },

  // Function to process 'processor_description' attribute
  processProcessorDescription: (attribute: any[]) => {
    return attribute.map((item) => item.value);
  },

  // Function to process 'memory_storage_capacity' attribute
  processMemoryStorageCapacity: (attribute: any[]) => {
    return attribute.map((item) => `${item.value} ${item.unit}`);
  },

  // Function to process 'solid_state_storage_drive' attribute
  processSolidStateStorageDrive: (attribute: any[]) => {
    return attribute.map((item) => `${item.capacity.value} ${item.capacity.unit}`);
  },

  // Function to process 'ram_memory' attribute
  processRamMemory: (attribute: any[]) => {
    return attribute.flatMap((item) =>
      item.installed_size.map((installed: any) => `${installed.value} ${installed.unit}`)
    );
  },
};

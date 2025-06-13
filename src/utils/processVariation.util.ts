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

  // Enhanced processNotebookComputerAttributes function
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

    // Create variations for each size while preserving original structure
    const displayVariations: any[] = [];

    attribute.forEach((displayItem) => {
      displayItem.size.forEach((sizeItem: any) => {
        const displayValue = `${sizeItem.value} ${sizeItem.unit}`;

        // Create a new display object with only the selected size but preserve all other properties
        const newDisplayItem = {
          ...displayItem,
          size: [sizeItem], // Only include the selected size
        };

        displayVariations.push({
          displayValue: displayValue,
          originalStructure: [newDisplayItem], // Keep as array like in DB
        });
      });
    });

    return displayVariations;
  },

  // Function to process 'processor_description' attribute
  processProcessorDescription: (attribute: any[]) => {
    return attribute.map((item) => ({
      displayValue: item.value,
      originalStructure: [item], // Keep as array like in DB
    }));
  },

  // Enhanced function to process 'memory_storage_capacity' attribute
  processMemoryStorageCapacity: (attribute: any[]) => {
    return attribute.map((item) => ({
      displayValue: `${item.value} ${item.unit}`,
      originalStructure: [item], // Keep as array like in DB
    }));
  },

  // Enhanced function to process 'solid_state_storage_drive' attribute
  processSolidStateStorageDrive: (attribute: any[]) => {
    return attribute.map((item) => ({
      displayValue: `${item.capacity.value} ${item.capacity.unit}`,
      originalStructure: [item], // Keep as array like in DB
    }));
  },

  // Enhanced function to process 'ram_memory' attribute
  processRamMemory: (attribute: any[]) => {
    const ramVariations: any[] = [];

    attribute.forEach((ramItem) => {
      ramItem.installed_size.forEach((installedSize: any) => {
        const displayValue = `${installedSize.value} ${installedSize.unit}`;

        // Create a new ram object with the selected installed_size but preserve all other properties
        const newRamItem = {
          ...ramItem,
          installed_size: [installedSize], // Only include the selected installed_size
        };

        ramVariations.push({
          displayValue: displayValue,
          originalStructure: [newRamItem], // Keep as array like in DB
        });
      });
    });

    return ramVariations;
  },
};

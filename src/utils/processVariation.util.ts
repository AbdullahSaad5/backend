import dotenv from "dotenv";

dotenv.config({
  path: `.env.${process.env.NODE_ENV || "dev"}`,
});

export const processVariationsUtility = {
  // Function to process attributes based on the category
  // Enhanced processAttributesByCategory function
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

  processNotebookComputerAttributes: (attributes: any) => {
    const processedAttributes: any = {};

    const attributesObj = attributes instanceof Map ? Object.fromEntries(attributes) : attributes;

    // Ensure display attribute exists and has valid data
    if (attributesObj.display && Array.isArray(attributesObj.display)) {
      const displayResult = processVariationsUtility.processDisplayAttribute(attributesObj.display);
      if (displayResult.length > 0) {
        processedAttributes.display = displayResult;
      }
    }

    // Ensure computer memory attribute exists and has valid data
    if (attributesObj.computer_memory && Array.isArray(attributesObj.computer_memory)) {
      const displayResult = processVariationsUtility.processComputerMemoryAttribute(attributesObj.computer_memory);
      if (displayResult.length > 0) {
        processedAttributes.computer_memory = displayResult;
      }
    }

    // Ensure hard_disk attribute exists and has valid data
    if (attributesObj.hard_disk && Array.isArray(attributesObj.hard_disk)) {
      const displayResult = processVariationsUtility.processHardDiskAttribute(attributesObj.hard_disk);
      if (displayResult.length > 0) {
        processedAttributes.hard_disk = displayResult;
      }
    }

    // Processing for RAM memory
    // if (attributesObj.ram_memory && Array.isArray(attributesObj.ram_memory) && attributesObj.ram_memory.length > 0) {
    //   const ramResult = processVariationsUtility.processRamMemory(attributesObj.ram_memory);
    //   if (ramResult.length > 0) {
    //     processedAttributes.ram_memory = ramResult;
    //   }
    // }

    // Processing for processor_description (just extracting the value)
    if (
      attributesObj.processor_description &&
      Array.isArray(attributesObj.processor_description) &&
      attributesObj.processor_description.length > 0
    ) {
      const processorResult = processVariationsUtility.processProcessorDescription(attributesObj.processor_description);
      if (processorResult.length > 0) {
        processedAttributes.processor_description = processorResult;
      }
    }

    // Processing for solid_state_storage_drive (concatenate `capacity` values)
    if (
      attributesObj.solid_state_storage_drive &&
      Array.isArray(attributesObj.solid_state_storage_drive) &&
      attributesObj.solid_state_storage_drive.length > 0
    ) {
      const ssdResult: any = processVariationsUtility.processSolidStateStorageDrive(
        attributesObj.solid_state_storage_drive
      );
      if (ssdResult.length > 0) {
        processedAttributes.solid_state_storage_drive = ssdResult;
      }
    }

    // Processing for memory_storage_capacity (concatenate `value` and `unit`)
    if (
      attributesObj.memory_storage_capacity &&
      Array.isArray(attributesObj.memory_storage_capacity) &&
      attributesObj.memory_storage_capacity.length > 0
    ) {
      const memoryResult: any = processVariationsUtility.processMemoryStorageCapacity(
        attributesObj.memory_storage_capacity
      );
      if (memoryResult.length > 0) {
        processedAttributes.memory_storage_capacity = memoryResult;
      }
    }

    // Returning only the processed attributes that have valid data
    return processedAttributes;
  },

  // **Placeholder for future categories**
  processOtherCategoryAttributes: (attributes: any) => {
    // Implement logic for other categories as needed.
    // For example, if there's a "smartphone" category, process its attributes differently.
    return {};
  },
  // Enhanced function to process 'display' attribute with original structure
  processDisplayAttribute: (attribute: any[]) => {
    console.log("Processing display attribute:", attribute);

    const displayVariations: any[] = [];

    attribute.forEach((displayItem) => {
      // Check if the size array contains more than one item
      if (displayItem.size && displayItem.size.length > 1) {
        displayItem.size.forEach((sizeItem: any) => {
          const displayValue = `${sizeItem.value} ${sizeItem.unit}`;

          const newDisplayItem = {
            ...displayItem,
            size: [sizeItem], // Only include the selected size
          };

          displayVariations.push({
            displayValue: displayValue,
            originalStructure: [newDisplayItem], // Keep as array like in DB
          });
        });
      }
    });

    return displayVariations;
  },
  processComputerMemoryAttribute: (attribute: any[]) => {
    console.log("Processing Computer Memory attribute:", attribute);

    const displayVariations: any[] = [];

    attribute.forEach((displayItem) => {
      if (displayItem.size && displayItem.size.length > 1) {
        displayItem.size.forEach((sizeItem: any) => {
          const displayValue = `${sizeItem.value} ${sizeItem.unit}`;

          const newDisplayItem = {
            ...displayItem,
            size: [sizeItem], // Only include the selected size
          };

          displayVariations.push({
            displayValue: displayValue,
            originalStructure: [newDisplayItem], // Keep as array like in DB
          });
        });
      }
    });

    return displayVariations;
  },
  processHardDiskAttribute: (attribute: any[]) => {
    console.log("Processing Hard Disk attribute:", attribute);

    const displayVariations: any[] = [];

    attribute.forEach((displayItem) => {
      if (displayItem.size && displayItem.size.length > 1) {
        displayItem.size.forEach((sizeItem: any) => {
          const displayValue = `${sizeItem.value} ${sizeItem.unit}`;

          const newDisplayItem = {
            ...displayItem,
            size: [sizeItem], // Only include the selected size
          };

          displayVariations.push({
            displayValue: displayValue,
            originalStructure: [newDisplayItem], // Keep as array like in DB
          });
        });
      }
    });

    return displayVariations;
  },
  // Enhanced function to process 'processor_description' attribute
  processProcessorDescription: (attribute: any[]) => {
    // Only process if the attribute array has more than one item
    if (attribute.length > 1) {
      return attribute.map((item) => ({
        displayValue: item.value,
        originalStructure: [item], // Keep as array like in DB
      }));
    }

    // If there's only one item, return an empty array or skip variations
    return [];
  },

  // Enhanced function to process 'memory_storage_capacity' attribute
  processMemoryStorageCapacity: (attribute: any[]) => {
    if (attribute.length > 1) {
      return attribute.map((item) => ({
        displayValue: `${item.value} ${item.unit}`,
        originalStructure: [item], // Keep as array like in DB
      }));
    }

    // Return an empty array if there is only one item
    return [];
  },

  // Enhanced function to process 'solid_state_storage_drive' attribute
  processSolidStateStorageDrive: (attribute: any[]) => {
    if (attribute.length > 1) {
      return attribute.map((item) => ({
        displayValue: `${item.capacity.value} ${item.capacity.unit}`,
        originalStructure: [item], // Keep as array like in DB
      }));
    }

    // Return an empty array if there is only one item
    return [];
  },

  // Enhanced function to process 'ram_memory' attribute
  // processRamMemory: (attribute: any[]) => {
  //   const ramVariations: any[] = [];

  //   attribute.forEach((ramItem) => {
  //     if (ramItem.installed_size && ramItem.installed_size.length > 1) {
  //       ramItem.installed_size.forEach((installedSize: any) => {
  //         const displayValue = `${installedSize.value} ${installedSize.unit}`;

  //         const newRamItem = {
  //           ...ramItem,
  //           installed_size: [installedSize], // Only include the selected installed_size
  //         };

  //         ramVariations.push({
  //           displayValue: displayValue,
  //           originalStructure: [newRamItem], // Keep as array like in DB
  //         });
  //       });
  //     }
  //   });

  //   return ramVariations;
  // },
};

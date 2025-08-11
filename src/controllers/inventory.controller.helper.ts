import { Request, Response } from "express";
import { inventoryService } from "@/services"; // Adjust import path as needed
import { bulkImportUtility } from "@/utils/bulkImport.util";
import { addLog, getLogs, clearLogs } from "@/utils/bulkImportLogs.util"; // Adjust import path as needed

// Assuming you have the service imported

export const handleBulkImport = async (req: Request, res: Response) => {
  clearLogs();
  try {
    if (!req.file) {
      addLog("❌ No file uploaded");
      return res.status(400).json({ error: "No file uploaded", logs: getLogs() });
    }
    addLog("📂 File uploaded, processing started...");
    const xlsxFilePath = req.file.path;

    await bulkImportUtility.processXLSXFile(xlsxFilePath);

    // Send back detailed logs and status
    res.status(200).json({
      message: "File processing started",
      logs: getLogs(), // Send logs to frontend
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    addLog(`❌ Error: ${errorMessage}`);
    res.status(500).json({ error: errorMessage, logs: getLogs() });
  }
};

// Updated controller to handle both specific IDs and "select all pages"
export const handleBulkExport = async (req: Request, res: Response) => {
  try {
    const { inventoryIds, selectAllPages } = req.body;

    // Validate input - either specific IDs or select all flag
    if (!selectAllPages && (!Array.isArray(inventoryIds) || inventoryIds.length === 0)) {
      return res.status(400).json({
        error: "Either inventoryIds must be a non-empty array or selectAllPages must be true",
      });
    }

    // if (selectAllPages) {
    //   return res.status(400).json({
    //     error: "filters are required when selectAllPages is true",
    //   });
    // }

    const { fromCache, file, totalExported } = await inventoryService.exportInventory({
      inventoryIds: inventoryIds || [],
      selectAllPages: selectAllPages || false,
      // filters: filters || {},
    });

    // Debug logging to help troubleshoot cache issues
    console.log(
      `Export result - fromCache: ${fromCache}, fileLength: ${file?.length || 0}, totalExported: ${totalExported}`
    );

    res.status(200).json({
      message: fromCache ? "Served from cache" : "Generated new Excel file",
      file, // single base64 encoded Excel file string
      totalExported, // number of items exported
      selectAllPages: selectAllPages || false,
    });
  } catch (err: any) {
    console.error("Bulk export error:", err);
    res.status(500).json({ error: err.message });
  }
};

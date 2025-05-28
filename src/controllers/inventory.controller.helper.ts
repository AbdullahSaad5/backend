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
    const zipFilePath = req.file.path;

    await bulkImportUtility.processZipFile(zipFilePath);

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
export const handleBulkExport = async (req: Request, res: Response) => {
  try {
    const { inventoryIds } = req.body;

    if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return res.status(400).json({ error: "inventoryIds must be a non-empty array" });
    }

    const { fromCache, file } = await inventoryService.exportInventory(inventoryIds);

    res.status(200).json({
      message: fromCache ? "Served from cache" : "Generated new Excel file",
      file, // single base64 encoded Excel file string
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

import { Request, Response } from "express";
import { inventoryService } from "@/services"; // Adjust import path as needed
import { processZipFile } from "@/utils/bulkImport.util";
import { addLog, getLogs } from "@/utils/bulkImportLogs.util"; // Adjust import path as needed
// Assuming you have the service imported

export const handleBulkImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      addLog("❌ No file uploaded");
      return res.status(400).json({ error: "No file uploaded", logs: getLogs() });
    }

    addLog("📂 File uploaded, processing started...");
    const zipFilePath = req.file.path;

    await processZipFile(zipFilePath);

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
    const filePath = await inventoryService.exportInventory();

    // Send the file as  download to the client
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).json({ error: "Failed to download file" });
      } else {
        console.log("✅ File sent successfully.");
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

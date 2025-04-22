import { Request, Response } from "express";
import { inventoryService } from "@/services"; // Adjust import path as needed
import { processZipFile } from "@/utils/bulkImport.util";
import { Inventory } from "@/models";
import { addLog, getLogs, clearLogs } from "@/utils/bulkImportLogs.util"; // Adjust import path as needed
import { Parser } from "json2csv";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
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
    const { inventoryIds } = req.body;

    if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return res.status(400).json({ error: "No inventory IDs provided" });
    }

    const filePath = await inventoryService.exportInventory(inventoryIds);

    // Send the CSV file as download
    res.download(filePath, (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        res.status(500).json({ error: "Failed to send CSV file" });
      } else {
        console.log("✅ CSV file sent successfully.");

        // After the file has been sent, delete it from the server
        try {
          fs.unlinkSync(filePath); // Delete the file
          console.log("🗑️ CSV file deleted after sending.");
        } catch (deleteError) {
          console.error("❌ Error deleting CSV file:", deleteError);
        }
      }
    });
  } catch (error: any) {
    console.error("❌ Error exporting inventory:", error.message);
    res.status(500).json({ error: error.message });
  }
};

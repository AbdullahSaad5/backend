import { Request, Response } from "express";
import { productService } from "@/services"; // Adjust import path as needed
import { processZipFile } from "@/utils/bulkImport.util";
import * as fs from "fs";

export const handleBulkImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const zipFilePath = req.file.path;
    await processZipFile(zipFilePath);
    // fs.unlinkSync(zipFilePath);
    res.status(200).json({ message: "File processing started" });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
};
export const handleBulkExport = async (req: Request, res: Response) => {
  try {
    const filePath = await productService.exportProducts();

    // Send the file as a download to the client
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

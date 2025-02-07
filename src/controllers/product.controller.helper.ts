import { Request, Response } from "express";
import { productService } from "@/services"; // Adjust import path as needed

export const handleBulkImport = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Call the service layer
    await productService.bulkImportProducts(req.file.path);
    res.status(201).json({ message: "Bulk import successful" });
  } catch (error: any) {
    // Handling validation or other errors from service
    res.status(500).json({ error: error.message });
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

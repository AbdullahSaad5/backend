import { Request, Response } from "express";
import { featuredSaleService } from "@/services";
import { StatusCodes } from "http-status-codes";

export const featuredSaleController = {
  // Create a new featured sale
  createSale: async (req: Request, res: Response) => {
    try {
      console.log("[createSale] Request body:", req.body);
      let saleData = { ...req.body };
      if (req.file && (req.file as any).location) {
        saleData.imageUrl = (req.file as any).location;
      }
      const sale = await featuredSaleService.createSale(saleData);
      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Sale created successfully",
        data: sale,
      });
    } catch (error) {
      console.error("Error creating featured sale:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        ("status" in error || "statusCode" in error) &&
        ((typeof (error as any).status === "number" &&
          (error as any).status === StatusCodes.BAD_REQUEST) ||
          (typeof (error as any).statusCode === "number" &&
            (error as any).statusCode === StatusCodes.BAD_REQUEST))
      ) {
        console.error(
          "[createSale] Status 400 - Bad Request. Request body:",
          req.body
        );
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create sale",
        data: null,
      });
    }
  },

  // Get all sales
  getSales: async (_req: Request, res: Response) => {
    try {
      const sales = await featuredSaleService.getSales();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched featured sales successfully",
        data: sales,
      });
    } catch (error) {
      console.error("Error fetching featured sales:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch sales",
        data: null,
      });
    }
  },

  // Get active sales only
  getActiveSales: async (_req: Request, res: Response) => {
    try {
      const sales = await featuredSaleService.getActiveSales();
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Fetched active featured sales successfully",
        data: sales,
      });
    } catch (error) {
      console.error("Error fetching active featured sales:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch active sales",
        data: null,
      });
    }
  },

  // Update a sale
  updateSale: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      let updateData = { ...req.body };
      if (req.file && (req.file as any).location) {
        updateData.imageUrl = (req.file as any).location;
      }
      const updated = await featuredSaleService.updateSale(id, updateData);
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Sale not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Sale updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating featured sale:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update sale",
        data: null,
      });
    }
  },

  // Update sale status only
  updateSaleStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["active", "inactive"].includes(status)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid status. Must be 'active' or 'inactive'",
          data: null,
        });
      }

      const updated = await featuredSaleService.updateSale(id, { status });
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Sale not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Sale status updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Error updating featured sale status:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to update sale status",
        data: null,
      });
    }
  },

  // Delete a sale
  deleteSale: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await featuredSaleService.deleteSale(id);
      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Sale not found",
          data: null,
        });
      }
      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Sale deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Error deleting featured sale:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete sale",
        data: null,
      });
    }
  },
};

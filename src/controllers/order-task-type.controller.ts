import { orderTaskTypeService } from "@/services/order-task-type.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";

export const orderTaskTypeController = {
  createOrderTaskType: async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        defaultEstimatedTimeMinutes,
        defaultPriority,
        requiredSkills,
        relevantCategories,
        relevantConditions,
        isOrderLevel,
      } = req.body;

      // Convert relevantCategories array to ObjectIds if present
      let processedRelevantCategories = relevantCategories;
      if (relevantCategories && Array.isArray(relevantCategories)) {
        processedRelevantCategories = relevantCategories.map((category: string) =>
          category === "All" ? "All" : new Types.ObjectId(category)
        );
      }

      const newOrderTaskType = await orderTaskTypeService.createOrderTaskType({
        name,
        description,
        defaultEstimatedTimeMinutes,
        defaultPriority,
        requiredSkills,
        relevantCategories: processedRelevantCategories,
        relevantConditions,
        isOrderLevel,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Order task type created successfully",
        data: newOrderTaskType,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating order task type",
        error: error.message,
      });
    }
  },

  getAllOrderTaskTypes: async (req: Request, res: Response) => {
    try {
      const orderTaskTypes = await orderTaskTypeService.getAllOrderTaskTypes();
      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskTypes,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order task types",
        error: error.message,
      });
    }
  },

  getOrderTaskTypeById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const orderTaskType = await orderTaskTypeService.getOrderTaskTypeById(id);

      if (!orderTaskType) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order task type not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskType,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order task type",
        error: error.message,
      });
    }
  },

  getOrderTaskTypeByTaskTypeId: async (req: Request, res: Response) => {
    try {
      const { taskTypeId } = req.params;
      const orderTaskType = await orderTaskTypeService.getOrderTaskTypeByTaskTypeId(taskTypeId);

      if (!orderTaskType) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order task type not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskType,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order task type",
        error: error.message,
      });
    }
  },

  updateOrderTaskType: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Convert relevantCategories array to ObjectIds if present
      if (updateData.relevantCategories && Array.isArray(updateData.relevantCategories)) {
        updateData.relevantCategories = updateData.relevantCategories.map((category: string) =>
          category === "All" ? "All" : new Types.ObjectId(category)
        );
      }

      const updatedOrderTaskType = await orderTaskTypeService.updateOrderTaskType(id, updateData);

      if (!updatedOrderTaskType) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order task type not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Order task type updated successfully",
        data: updatedOrderTaskType,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating order task type",
        error: error.message,
      });
    }
  },

  deleteOrderTaskType: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedOrderTaskType = await orderTaskTypeService.deleteOrderTaskType(id);

      if (!deletedOrderTaskType) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Order task type not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Order task type deleted successfully",
        data: deletedOrderTaskType,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting order task type",
        error: error.message,
      });
    }
  },

  getOrderTaskTypesByCategory: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const orderTaskTypes = await orderTaskTypeService.getOrderTaskTypesByCategory(categoryId);

      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskTypes,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order task types by category",
        error: error.message,
      });
    }
  },

  getOrderTaskTypesByCondition: async (req: Request, res: Response) => {
    try {
      const { condition } = req.params;
      const orderTaskTypes = await orderTaskTypeService.getOrderTaskTypesByCondition(condition);

      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskTypes,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order task types by condition",
        error: error.message,
      });
    }
  },

  getOrderLevelTaskTypes: async (req: Request, res: Response) => {
    try {
      const orderTaskTypes = await orderTaskTypeService.getOrderLevelTaskTypes();

      res.status(StatusCodes.OK).json({
        success: true,
        data: orderTaskTypes,
      });
    } catch (error: any) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching order level task types",
        error: error.message,
      });
    }
  },
};

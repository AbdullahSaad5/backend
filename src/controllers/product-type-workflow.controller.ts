import { Request, Response } from "express";
import { productTypeWorkflowService } from "@/services/product-type-workflow.service";
import { StatusCodes } from "http-status-codes";
import { isValidObjectId } from "mongoose";
import { IProductTypeWorkflowCreatePayload } from "@/contracts/product-type-workflow.contract";

export const productTypeWorkflowController = {
  async createWorkflow(req: Request, res: Response) {
    try {
      const { name, description, appliesToCategory, appliesToCondition, steps, isActive, appliesToOrderType } =
        req.body;

      if (!name) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "name is required",
        });
      }

      if (!appliesToCategory || !isValidObjectId(appliesToCategory)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Valid appliesToCategory is required",
        });
      }

      if (!steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "steps array is required and must not be empty",
        });
      }

      // Validate steps structure
      for (const step of steps) {
        if (!step.taskTypeId || !isValidObjectId(step.taskTypeId)) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Each step must have a valid taskTypeId",
          });
        }

        // Validate dependsOnSteps if provided
        if (step.dependsOnSteps) {
          if (!Array.isArray(step.dependsOnSteps)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "dependsOnSteps must be an array",
            });
          }

          // Validate that all dependency IDs are valid ObjectIds
          for (const dependencyId of step.dependsOnSteps) {
            if (!isValidObjectId(dependencyId)) {
              return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Invalid dependency ID: ${dependencyId}`,
              });
            }
          }

          // Check for circular dependencies
          if (step.dependsOnSteps.includes(step.id)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "A step cannot depend on itself",
            });
          }
        }

        // Validate that step has an id
        if (!step.id) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Each step must have a valid id",
          });
        }
      }

      const workflowData: IProductTypeWorkflowCreatePayload = {
        name,
        description,
        appliesToCategory,
        appliesToCondition,
        appliesToOrderType,
        steps,
        isActive: isActive !== undefined ? isActive : true,
      };

      const newWorkflow = await productTypeWorkflowService.createWorkflow(workflowData);
      const populated = await productTypeWorkflowService.getWorkflowById(newWorkflow._id as string);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Workflow created successfully",
        data: populated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating workflow",
        error: error.message,
      });
    }
  },

  async getAllWorkflows(req: Request, res: Response) {
    try {
      const workflows = await productTypeWorkflowService.getAllWorkflows();
      return res.status(StatusCodes.OK).json({
        success: true,
        count: workflows.length,
        data: workflows,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workflows",
        error: error.message,
      });
    }
  },

  async getActiveWorkflows(req: Request, res: Response) {
    try {
      const workflows = await productTypeWorkflowService.getActiveWorkflows();
      return res.status(StatusCodes.OK).json({
        success: true,
        count: workflows.length,
        data: workflows,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching active workflows",
        error: error.message,
      });
    }
  },

  async getWorkflowById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workflow ID",
        });
      }

      const workflow = await productTypeWorkflowService.getWorkflowById(id);
      if (!workflow) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workflow not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workflow",
        error: error.message,
      });
    }
  },

  async getWorkflowByWorkflowId(req: Request, res: Response) {
    try {
      const { workflowId } = req.params;
      if (!workflowId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Workflow ID is required",
        });
      }

      const workflow = await productTypeWorkflowService.getWorkflowByWorkflowId(workflowId);
      if (!workflow) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workflow not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workflow",
        error: error.message,
      });
    }
  },

  async getWorkflowsByCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      if (!isValidObjectId(categoryId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      const workflows = await productTypeWorkflowService.getWorkflowsByCategory(categoryId);
      return res.status(StatusCodes.OK).json({
        success: true,
        count: workflows.length,
        data: workflows,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching workflows by category",
        error: error.message,
      });
    }
  },

  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workflow ID",
        });
      }

      // Validate appliesToCategory if provided
      if (updateData.appliesToCategory && !isValidObjectId(updateData.appliesToCategory)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid appliesToCategory ID",
        });
      }

      // Validate steps if provided
      if (updateData.steps) {
        if (!Array.isArray(updateData.steps) || updateData.steps.length === 0) {
          return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "steps must be a non-empty array",
          });
        }

        for (const step of updateData.steps) {
          if (!step.taskTypeId || !isValidObjectId(step.taskTypeId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Each step must have a valid taskTypeId",
            });
          }

          // Validate dependsOnSteps if provided
          if (step.dependsOnSteps) {
            if (!Array.isArray(step.dependsOnSteps)) {
              return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "dependsOnSteps must be an array",
              });
            }

            // Validate that all dependency IDs are valid ObjectIds
            for (const dependencyId of step.dependsOnSteps) {
              if (!isValidObjectId(dependencyId)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                  success: false,
                  message: `Invalid dependency ID: ${dependencyId}`,
                });
              }
            }

            // Check for circular dependencies
            if (step.dependsOnSteps.includes(step.id)) {
              return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "A step cannot depend on itself",
              });
            }
          }

          // Validate that step has an id
          if (!step.id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
              success: false,
              message: "Each step must have a valid id",
            });
          }
        }
      }

      const updated = await productTypeWorkflowService.updateWorkflow(id, updateData);
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workflow not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Workflow updated successfully",
        data: updated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating workflow",
        error: error.message,
      });
    }
  },

  async toggleWorkflowStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workflow ID",
        });
      }

      const updated = await productTypeWorkflowService.toggleWorkflowStatus(id);
      if (!updated) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workflow not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `Workflow ${updated.isActive ? "activated" : "deactivated"} successfully`,
        data: updated,
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error toggling workflow status",
        error: error.message,
      });
    }
  },

  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Invalid workflow ID",
        });
      }

      const deleted = await productTypeWorkflowService.deleteWorkflow(id);
      if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Workflow not found",
        });
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Workflow deleted successfully",
      });
    } catch (error: any) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting workflow",
        error: error.message,
      });
    }
  },
};

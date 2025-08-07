import { ProductTypeWorkflow } from "@/models/product-type-workflow.model";
import {
  IProductTypeWorkflow,
  IProductTypeWorkflowCreatePayload,
  IProductTypeWorkflowUpdatePayload,
} from "@/contracts/product-type-workflow.contract";
import { Types } from "mongoose";

export const productTypeWorkflowService = {
  async createWorkflow(data: IProductTypeWorkflowCreatePayload) {
    return await ProductTypeWorkflow.create(data);
  },

  async getAllWorkflows() {
    return await ProductTypeWorkflow.find()
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      })
      .sort({ createdAt: -1 });
  },

  async getWorkflowById(id: string) {
    return await ProductTypeWorkflow.findById(id)
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      });
  },

  async getWorkflowByWorkflowId(workflowId: string) {
    return await ProductTypeWorkflow.findOne({ workflowId })
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      });
  },

  async getWorkflowsByCategory(categoryId: string) {
    return await ProductTypeWorkflow.find({
      appliesToCategory: new Types.ObjectId(categoryId),
      isActive: true,
    })
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      })
      .sort({ createdAt: -1 });
  },

  async updateWorkflow(id: string, data: IProductTypeWorkflowUpdatePayload) {
    return await ProductTypeWorkflow.findByIdAndUpdate(id, data, { new: true })
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      });
  },

  async deleteWorkflow(id: string) {
    return await ProductTypeWorkflow.findByIdAndDelete(id);
  },

  async toggleWorkflowStatus(id: string) {
    const workflow = await ProductTypeWorkflow.findById(id);
    if (!workflow) return null;

    workflow.isActive = !workflow.isActive;
    return await workflow.save();
  },

  async getActiveWorkflows() {
    return await ProductTypeWorkflow.find({ isActive: true })
      .populate({
        path: "appliesToCategory",
        select: "name description",
      })
      .populate({
        path: "steps.taskTypeId",
        select: "name description estimatedTimeMinutes defaultPriority defaultAssignedRole",
      })
      .populate({
        path: "steps.overrideDefaultAssignedRole",
        select: "role",
      })
      .sort({ createdAt: -1 });
  },
};

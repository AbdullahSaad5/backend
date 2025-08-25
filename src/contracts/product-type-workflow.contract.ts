import { Document, Model, Types } from "mongoose";
import { ENUMS } from "@/constants/enum";

type ProductCondition = (typeof ENUMS.PRODUCT_CONDITIONS)[number];

interface IWorkflowStep {
  id: string;
  stepOrder?: number;
  taskTypeId: Types.ObjectId;
  overrideEstimatedTimeMinutes?: number;
  overridePriority?: 1 | 2 | 3;
  overrideDefaultAssignedRole?: "Technician" | "Customer Service" | "Admin";
  dependsOnSteps?: string[];
}

export interface IProductTypeWorkflow extends Document {
  workflowId: string;
  name: string;
  description?: string;
  appliesToCategory: Types.ObjectId;
  appliesToCondition: ProductCondition;
  appliesToOrderType?: (typeof ENUMS.APPLIES_TO_ORDER_TYPE)[number];
  steps: IWorkflowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductTypeWorkflowCreatePayload {
  name: string;
  description?: string;
  appliesToCategory: Types.ObjectId;
  appliesToCondition?: ProductCondition;
  steps: IWorkflowStep[];
  isActive?: boolean;
  appliesToOrderType?: (typeof ENUMS.APPLIES_TO_ORDER_TYPE)[number];
}

export type IProductTypeWorkflowUpdatePayload = Partial<IProductTypeWorkflowCreatePayload>;

export type ProductTypeWorkflowModel = Model<IProductTypeWorkflow>;

export { ProductCondition, IWorkflowStep };

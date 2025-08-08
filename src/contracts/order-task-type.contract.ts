import { Document, Model, Types } from "mongoose";
import { ENUMS } from "@/constants/enum";

type TaskPriority = 1 | 2 | 3;

type ProductCondition = (typeof ENUMS.PRODUCT_CONDITIONS)[number];
type AutomationTriggerType = (typeof ENUMS.AUTOMATION_TRIGGER_TYPES)[number];
type TaskCategory = (typeof ENUMS.TASK_CATEGORIES)[number];

export interface IOrderTaskType extends Document {
  taskTypeId: string;
  name: string;
  description?: string;
  defaultEstimatedTimeMinutes: number;
  defaultPriority: TaskPriority;
  requiredSkills: string[];
  relevantCategories: (Types.ObjectId | "All")[];
  relevantConditions: (ProductCondition | "All")[];
  isOrderLevel: boolean;
  defaultAssignedRole: Types.ObjectId;
  defaultAssignedTeam: Types.ObjectId;
  isAutomated: boolean;
  automationTriggerType: AutomationTriggerType;
  taskCategory: TaskCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderTaskTypeCreatePayload {
  name: string;
  description?: string;
  defaultEstimatedTimeMinutes?: number;
  defaultPriority?: TaskPriority;
  requiredSkills?: string[];
  relevantCategories?: (Types.ObjectId | "All")[];
  relevantConditions?: (ProductCondition | "All")[];
  isOrderLevel?: boolean;
  defaultAssignedRole?: Types.ObjectId;
  isAutomated?: boolean;
  automationTriggerType?: AutomationTriggerType;
  taskCategory?: TaskCategory;
  defaultAssignedTeam?: Types.ObjectId;
}

export type IOrderTaskTypeUpdatePayload = Partial<IOrderTaskTypeCreatePayload>;

export type OrderTaskTypeModel = Model<IOrderTaskType>;

export { TaskPriority, ProductCondition, AutomationTriggerType, TaskCategory };

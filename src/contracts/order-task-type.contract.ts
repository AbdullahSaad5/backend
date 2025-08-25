import { Document, Model, Types } from "mongoose";
import { ENUMS } from "@/constants/enum";

type TaskPriority = 1 | 2 | 3;

type ProductCondition = (typeof ENUMS.PRODUCT_CONDITIONS)[number];
type AutomationTriggerType = (typeof ENUMS.AUTOMATION_TRIGGER_TYPES)[number];
type TaskCategory = (typeof ENUMS.TASK_CATEGORIES)[number];

// New task type definitions
type TaskType = "ACTIONABLE" | "AUTOMATED" | "NOTIFICATION" | "EMAIL" | "SMS" | "WEBHOOK";
type ActionType = "HUMAN_ACTION" | "SYSTEM_ACTION" | "WEBHOOK_ACTION";
type NotificationType = "EMAIL" | "SMS" | "PUSH" | "IN_APP";
type WebhookMethod = "GET" | "POST" | "PUT" | "DELETE";

// Webhook header interface
interface WebhookHeader {
  key: string;
  value: string;
}

export interface IOrderTaskType extends Document {
  taskTypeId: string;
  name: string;
  description?: string;

  // Task Type Configuration
  taskType: TaskType;
  actionType?: ActionType;
  notificationType?: NotificationType;

  // Actionable Task Fields (conditional)
  defaultEstimatedTimeMinutes?: number;
  defaultPriority?: TaskPriority;
  requiredSkills?: string[];
  relevantCategories?: (Types.ObjectId | "All")[];
  relevantConditions?: (ProductCondition | "All")[];
  isOrderLevel?: boolean;
  defaultAssignedRole?: Types.ObjectId;
  defaultAssignedTeam?: Types.ObjectId;

  // Automation Fields (conditional)
  isAutomated?: boolean;
  automationTriggerType?: AutomationTriggerType;

  // Common Fields
  taskCategory: TaskCategory;

  // Email Task Fields (conditional)
  emailTemplate?: string;
  emailSubject?: string;

  // SMS Task Fields (conditional)
  smsContent?: string;

  // Notification Task Fields (conditional)
  notificationContent?: string;

  // Webhook Task Fields (conditional)
  webhookUrl?: string;
  webhookMethod?: WebhookMethod;
  webhookHeaders?: WebhookHeader[];
  webhookBody?: string;
  retryAttempts?: number;
  retryDelayMinutes?: number;
  successCriteria?: string;
  failureCriteria?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderTaskTypeCreatePayload {
  name: string;
  description?: string;

  // Task Type Configuration
  taskType: TaskType;
  actionType?: ActionType;
  notificationType?: NotificationType;

  // Actionable Task Fields (conditional)
  defaultEstimatedTimeMinutes?: number;
  defaultPriority?: TaskPriority;
  requiredSkills?: string[];
  relevantCategories?: (Types.ObjectId | "All")[];
  relevantConditions?: (ProductCondition | "All")[];
  isOrderLevel?: boolean;
  defaultAssignedRole?: Types.ObjectId;
  defaultAssignedTeam?: Types.ObjectId;

  // Automation Fields (conditional)
  isAutomated?: boolean;
  automationTriggerType?: AutomationTriggerType;

  // Common Fields
  taskCategory: TaskCategory;

  // Email Task Fields (conditional)
  emailTemplate?: string;
  emailSubject?: string;

  // SMS Task Fields (conditional)
  smsContent?: string;

  // Notification Task Fields (conditional)
  notificationContent?: string;

  // Webhook Task Fields (conditional)
  webhookUrl?: string;
  webhookMethod?: WebhookMethod;
  webhookHeaders?: WebhookHeader[];
  webhookBody?: string;
  retryAttempts?: number;
  retryDelayMinutes?: number;
  successCriteria?: string;
  failureCriteria?: string;
}

export type IOrderTaskTypeUpdatePayload = Partial<IOrderTaskTypeCreatePayload>;

export type OrderTaskTypeModel = Model<IOrderTaskType>;

export {
  TaskPriority,
  ProductCondition,
  AutomationTriggerType,
  TaskCategory,
  TaskType,
  ActionType,
  NotificationType,
  WebhookMethod,
  WebhookHeader,
};

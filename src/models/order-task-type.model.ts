import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { ENUMS } from "@/constants/enum";
import { model, Schema } from "mongoose";
import { IOrderTaskType, OrderTaskTypeModel } from "@/contracts/order-task-type.contract";

const TaskTypeSchema = new Schema<IOrderTaskType>(
  {
    taskTypeId: { type: String, unique: true, default: () => generateUniqueId("TT") },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },

    // Task Type Configuration
    taskType: {
      type: String,
      required: true,
      enum: ["ACTIONABLE", "AUTOMATED", "NOTIFICATION", "EMAIL", "SMS", "WEBHOOK"],
      index: true,
    },
    actionType: {
      type: String,
      enum: ["HUMAN_ACTION", "SYSTEM_ACTION", "WEBHOOK_ACTION"],
    },
    notificationType: {
      type: String,
      enum: ["EMAIL", "SMS", "PUSH", "IN_APP"],
    },

    // Actionable Task Fields (conditional)
    defaultEstimatedTimeMinutes: { type: Number, min: 1, default: 30 },
    defaultPriority: {
      type: Number,
      enum: [1, 2, 3],
      default: 2,
    },
    requiredSkills: [{ type: String, trim: true }],
    relevantCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProductCategory",
        default: "All",
      },
    ],
    relevantConditions: [
      {
        type: String,
        enum: ENUMS.PRODUCT_CONDITIONS,
        default: "All",
      },
    ],
    isOrderLevel: { type: Boolean, default: false },
    defaultAssignedRole: {
      type: Schema.Types.ObjectId,
      ref: "UserCategory",
      default: null,
    },
    defaultAssignedTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },

    // Automation Fields (conditional)
    isAutomated: { type: Boolean, default: false },
    automationTriggerType: {
      type: String,
      enum: ENUMS.AUTOMATION_TRIGGER_TYPES,
      default: "MANUAL",
    },

    // Common Fields
    taskCategory: {
      type: String,
      enum: ENUMS.TASK_CATEGORIES,
      required: true,
      default: "OTHER",
      index: true,
    },

    // Email Task Fields (conditional)
    emailTemplate: { type: String, trim: true },
    emailSubject: { type: String, trim: true },

    // SMS Task Fields (conditional)
    smsContent: { type: String, trim: true },

    // Notification Task Fields (conditional)
    notificationContent: { type: String, trim: true },

    // Webhook Task Fields (conditional)
    webhookUrl: { type: String, trim: true },
    webhookMethod: {
      type: String,
      enum: ["GET", "POST", "PUT", "DELETE"],
    },
    webhookHeaders: [
      {
        key: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    webhookBody: { type: String, trim: true },
    retryAttempts: { type: Number, min: 0, default: 0 },
    retryDelayMinutes: { type: Number, min: 0, default: 5 },
    successCriteria: { type: String, trim: true },
    failureCriteria: { type: String, trim: true },
  },
  { timestamps: true }
);

export const OrderTaskType = model<IOrderTaskType, OrderTaskTypeModel>("OrderTaskType", TaskTypeSchema);

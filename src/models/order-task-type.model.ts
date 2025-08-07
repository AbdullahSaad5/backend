import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { ENUMS } from "@/constants/enum";
import { model, Schema } from "mongoose";
import { IOrderTaskType, OrderTaskTypeModel } from "@/contracts/order-task-type.contract";

const TaskTypeSchema = new Schema<IOrderTaskType>(
  {
    taskTypeId: { type: String, unique: true, default: () => generateUniqueId("TT") },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
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
    isAutomated: { type: Boolean, default: false },
    automationTriggerType: {
      type: String,
      enum: ENUMS.AUTOMATION_TRIGGER_TYPES,
      default: "MANUAL",
    },
    taskCategory: {
      type: String,
      enum: ENUMS.TASK_CATEGORIES,
      required: true,
      default: "OTHER",
      index: true,
    },
  },
  { timestamps: true }
);

export const OrderTaskType = model<IOrderTaskType, OrderTaskTypeModel>("OrderTaskType", TaskTypeSchema);

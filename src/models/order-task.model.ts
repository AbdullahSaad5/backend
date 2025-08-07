import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { model, Schema } from "mongoose";
import { IOrderTask, OrderTaskModel } from "@/contracts/order-task.contract";

const TaskSchema = new Schema<IOrderTask>(
  {
    // Core Identifiers
    taskId: { type: String, unique: true, default: () => generateUniqueId("TASK") },
    _id: { type: Schema.Types.ObjectId, auto: true },

    // Links to Parent Entities
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderItemId: { type: String, index: true, default: null },
    taskTypeId: { type: Schema.Types.ObjectId, ref: "OrderTaskType", required: true },

    // Basic Task Details
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Ready", "In Progress", "Completed", "On Hold", "Cancelled"],
      required: true,
      default: "Pending",
      index: true,
    },
    priority: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      default: 2,
      index: true,
    },
    dueDate: { type: Date, index: true },
    notes: { type: String, trim: true, default: "" },

    // Time Tracking
    estimatedTimeMinutes: { type: Number, min: 1, default: 30 },
    actualTimeMinutes: { type: Number, min: 0, default: 0 },
    completedAt: { type: Date },

    // Assignment
    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User", index: true, default: null },
    assignedToUserName: { type: String, trim: true, default: null },

    // Automation & External Linking
    isAutomated: { type: Boolean, default: false },
    automationIdentifier: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    externalRefId: { type: String, trim: true, index: true, sparse: true, default: null },

    // Dependencies
    dependentOnTaskIds: [{ type: Schema.Types.ObjectId, ref: "OrderTask", index: true }],
    pendingDependenciesCount: { type: Number, default: 0, min: 0 },

    // Audit & Logging
    logs: [
      {
        _id: false,
        logId: { type: String, default: () => generateUniqueId("LOG") },
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
        userName: { type: String, trim: true, default: "System" },
        timestamp: { type: Date, default: Date.now },
        action: { type: String, trim: true, required: true },
        details: { type: String, trim: true },
      },
    ],

    // Customization & Ad-hoc
    isCustom: { type: Boolean, default: false },
    defaultAssignedRole: {
      type: Schema.Types.ObjectId,
      ref: "UserCategory",
      default: null,
    },
  },
  { timestamps: true }
);

export const OrderTask: OrderTaskModel = model<IOrderTask>("OrderTask", TaskSchema);

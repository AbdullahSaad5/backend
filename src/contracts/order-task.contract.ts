import { Document, Model, Types } from "mongoose";

type TaskStatus = "Pending" | "Ready" | "In Progress" | "Completed" | "On Hold" | "Cancelled";

type TaskPriority = 1 | 2 | 3;

interface ITaskLog {
  logId: string;
  userId?: Types.ObjectId;
  userName: string;
  timestamp: Date;
  action: string;
  details: string;
}

export interface IOrderTask extends Document {
  taskId: string;
  orderId: Types.ObjectId;
  orderItemId?: string;
  taskTypeId: Types.ObjectId;
  name: string;
  assignedToUserId?: Types.ObjectId;
  assignedToUserName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedTimeMinutes: number;
  actualTimeMinutes: number;
  notes?: string;
  completedAt?: Date;
  logs: ITaskLog[];
  isCustom: boolean;
  defaultAssignedRole?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  dependentOnTaskIds: Types.ObjectId[];
  pendingDependenciesCount: number;
  isAutomated: boolean;
  automationIdentifier?: string;
  externalRefId?: string;
}

export interface IOrderTaskCreatePayload {
  orderId: Types.ObjectId;
  orderItemId?: string;
  taskTypeId: Types.ObjectId;
  name: string;
  assignedToUserId?: Types.ObjectId;
  assignedToUserName?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedTimeMinutes?: number;
  actualTimeMinutes?: number;
  notes?: string;
  completedAt?: Date;
  logs?: ITaskLog[];
  isCustom?: boolean;
  defaultAssignedRole?: Types.ObjectId;
  isAutomated?: boolean;
  automationIdentifier?: string;
  externalRefId?: string;
}

export type IOrderTaskUpdatePayload = Partial<IOrderTaskCreatePayload>;

export type OrderTaskModel = Model<IOrderTask>;

export { TaskStatus, TaskPriority, ITaskLog };

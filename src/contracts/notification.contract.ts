import { Model, Types } from "mongoose";
import { ENUMS } from "@/constants/enum";

export interface INotification {
  id: Types.ObjectId;
  title: string;
  message: string;
  time: Date;
  type: (typeof ENUMS.NOTIFICATION_TYPES)[number];
  avatar?: string;
  sourceUserId?: Types.ObjectId;
  userIds: Types.ObjectId[];
  readBy: Types.ObjectId[];
  data?: any;
}

export type NotificationCreatePayload = Pick<
  INotification,
  "title" | "message" | "type" | "avatar" | "userIds" | "sourceUserId" | "data" | "time"
>;

export type NotificationModel = Model<INotification>;

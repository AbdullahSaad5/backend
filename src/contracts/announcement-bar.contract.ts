import { Document } from "mongoose";

export interface IAnnouncementBar extends Document {
  announcementText: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

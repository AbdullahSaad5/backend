import { Document, Model, Types } from "mongoose";

// Interface for Part Category
export interface IPartCategory extends Document {
  name: string;
  description: string;
  image?: string[];
  tags?: string[];
  isBlocked?: boolean;
}

export type PartCategoryModel = Model<IPartCategory>;

export type PartCategoryCreatePayload = Pick<IPartCategory, "name" | "description" | "image" | "isBlocked" | "tags">;

export type PartCategoryUpdatePayload = Partial<PartCategoryCreatePayload>


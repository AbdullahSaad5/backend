import { Document, Types } from "mongoose";

export interface ILocation extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ILocationCreate = Pick<
  ILocation,
  "name" | "address" | "latitude" | "longitude" | "radius" | "isActive" | "createdBy"
>;
export type ILocationUpdate = Partial<ILocationCreate>;

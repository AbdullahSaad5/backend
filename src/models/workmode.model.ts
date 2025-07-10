import { IWorkmode } from "@/contracts/workmode.contract";
import { model, Schema, Types } from "mongoose";

const WorkmodeSchema = new Schema<IWorkmode>({
  modeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
  },
  employees: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  ],
}, {
  timestamps: true,
});

export const Workmode = model<IWorkmode>("Workmode", WorkmodeSchema); 
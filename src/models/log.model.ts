// models/Log.js
import mongoose, { model, Schema } from "mongoose";

const logSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    firstName: { type: String, required: false }, // Store user's first name
    lastName: { type: String, required: false }, // Store user's last name
    ip: { type: String, required: true },
    method: { type: String, required: true },
    route: { type: String, required: true },
    statusCode: { type: Number, required: true },
    duration: { type: Number, required: true },
    userAgent: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    message: { type: String, required: false },
  },
  { timestamps: true }
);

export const Log = model("Log", logSchema);

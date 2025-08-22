import { Schema, model } from "mongoose";

export interface ICronProcessingLog {
  _id?: string;
  jobType: string; // 'autoCheckout' | 'markAbsent'
  employeeId: string;
  shiftId: string;
  date: string; // YYYY-MM-DD format
  processedAt: Date;
  expiresAt: Date; // When this log entry expires (24 hours from processedAt)
}

const cronProcessingLogSchema = new Schema<ICronProcessingLog>(
  {
    jobType: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    shiftId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    processedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index to ensure uniqueness per job type, employee, shift, and date
cronProcessingLogSchema.index(
  {
    jobType: 1,
    employeeId: 1,
    shiftId: 1,
    date: 1,
  },
  { unique: true }
);

// TTL index to automatically expire old entries after 24 hours
cronProcessingLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CronProcessingLog = model<ICronProcessingLog>("CronProcessingLog", cronProcessingLogSchema);

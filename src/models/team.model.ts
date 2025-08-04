import mongoose, { Schema, model } from "mongoose";
import { ITeam, TeamModel } from "@/contracts/team.contract";

const teamSchema = new Schema<ITeam>({
    name: { type: String, required: true },
    userCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCategory', required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Team = model<ITeam, TeamModel>('Team', teamSchema);

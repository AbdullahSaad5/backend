import { ITask } from "@/contracts/task.contract";
import { model, Schema, Types } from "mongoose";

const TaskSchema = new Schema<ITask>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        start: {
            type: Date,
            required: true,
        },
        end: {
            type: Date,
            required: true,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["To Do", "InProgress", "Completed"],
            default: "To Do",
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        assignees: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const TaskModel = model<ITask>("Task", TaskSchema); 
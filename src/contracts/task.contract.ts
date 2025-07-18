import { Document, Model, Types } from "mongoose";

export interface ITask extends Document {
    title: string;
    start: Date;
    end: Date;
    priority: "Low" | "Medium" | "High" | "Urgent";
    status: "To Do" | "InProgress" | "Completed";
    description: string;
    assignees: Types.ObjectId[];
}

export type TaskModel = Model<ITask>; 
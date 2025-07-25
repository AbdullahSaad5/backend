import { TaskModel } from "@/models/task.model";
import { ITask } from "@/contracts/task.contract";
import { Types } from "mongoose";

export const taskService = {
    createTask: (
        title: string,
        start: Date,
        end: Date,
        priority: "Low" | "Medium" | "High" | "Urgent",
        status: "To Do" | "InProgress" | "Completed",
        description: string,
        assignees: Types.ObjectId[]
    ) => {
        const newTask = new TaskModel({
            title,
            start,
            end,
            priority,
            status,
            description,
            assignees,
        });
        return newTask.save();
    },

    editTask: (
        id: string,
        data: {
            title?: string;
            start?: Date;
            end?: Date;
            priority?: "Low" | "Medium" | "High" | "Urgent";
            status?: "To Do" | "InProgress" | "Completed";
            description?: string;
            assignees?: Types.ObjectId[];
        }
    ) => {
        return TaskModel.findByIdAndUpdate(id, data, { new: true })
            .populate('assignees', 'firstName lastName email');
    },

    deleteTask: (id: string) => {
        const task = TaskModel.findByIdAndDelete(id);
        if (!task) {
            throw new Error("Task not found");
        }
        return task;
    },

    getAllTasks: () => {
        return TaskModel.find()
            .populate('assignees', 'firstName lastName email');
    },

    getById: (id: string) => {
        return TaskModel.findById(id)
            .populate('assignees', 'firstName lastName email');
    },

    changeStatus: (id: string, status: "To Do" | "InProgress" | "Completed") => {
        const updatedTask = TaskModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        )
            .populate('assignees', 'firstName lastName email');
        if (!updatedTask) {
            throw new Error("Task not found");
        }
        return updatedTask;
    },

    changePriority: (id: string, priority: "Low" | "Medium" | "High" | "Urgent") => {
        const updatedTask = TaskModel.findByIdAndUpdate(
            id,
            { priority },
            { new: true }
        )
            .populate('assignees', 'firstName lastName email');
        if (!updatedTask) {
            throw new Error("Task not found");
        }
        return updatedTask;
    },

    updateAssignees: (id: string, assignees: Types.ObjectId[]) => {
        const updatedTask = TaskModel.findByIdAndUpdate(
            id,
            { assignees },
            { new: true }
        )
            .populate('assignees', 'firstName lastName email');
        if (!updatedTask) {
            throw new Error("Task not found");
        }
        return updatedTask;
    }
}; 
import { taskService } from "@/services/task.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";

export const taskController = {
    createTask: async (req: Request, res: Response) => {
        try {
            const {
                title,
                start,
                end,
                priority = "Medium",
                status = "To Do",
                description,
                assignees,
            } = req.body;

            // Convert assignees array to ObjectIds
            const assigneeIds = assignees.map((assignee: string) => new Types.ObjectId(assignee));

            const newTask = await taskService.createTask(
                title,
                new Date(start),
                new Date(end),
                priority,
                status,
                description,
                assigneeIds
            );

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Task created successfully",
                data: newTask
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error creating task",
                error: error.message
            });
        }
    },

    editTask: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Convert assignees array to ObjectIds if present
            if (updateData.assignees) {
                updateData.assignees = updateData.assignees.map((assignee: string) => new Types.ObjectId(assignee));
            }

            // Convert dates if present
            if (updateData.start) {
                updateData.start = new Date(updateData.start);
            }
            if (updateData.end) {
                updateData.end = new Date(updateData.end);
            }

            const task = await taskService.editTask(id, updateData);
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Task updated successfully",
                data: task,
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error updating task",
                error: error.message
            });
        }
    },

    deleteTask: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const result = await taskService.deleteTask(id);
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Task deleted successfully",
                deletedTask: result,
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error deleting task",
                error: error.message
            });
        }
    },

    getAllTasks: async (req: Request, res: Response) => {
        try {
            const tasks = await taskService.getAllTasks();
            res.status(StatusCodes.OK).json({ success: true, data: tasks });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error getting tasks",
                error: error.message
            });
        }
    },

    getSpecificTask: async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            const result = await taskService.getById(id);
            if (!result) return res.status(404).json({ message: "Task not found" });
            res.status(StatusCodes.OK).json({ success: true, data: result });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error getting task",
                error: error.message
            });
        }
    },

    toggleTaskStatus: async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ["To Do", "InProgress", "Completed"];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Status must be one of: To Do, InProgress, Completed",
            });
        }

        try {
            const result = await taskService.changeStatus(id, status);
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Status changed successfully",
                data: result,
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error changing status",
                error: error.message
            });
        }
    },

    togglePriorityStatus: async (req: Request, res: Response) => {
        const { id } = req.params;
        const { priority } = req.body;

        const allowedPriorities = ["Low", "Medium", "High", "Urgent"];

        if (!priority || !allowedPriorities.includes(priority)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Priority must be one of: Low, Medium, High, Urgent",
            });
        }

        try {
            const result = await taskService.changePriority(id, priority);
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Priority changed successfully",
                data: result,
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error changing priority",
                error: error.message
            });
        }
    },

    updateAssignees: async (req: Request, res: Response) => {
        const { id } = req.params;
        const { assignees } = req.body;

        if (!assignees || !Array.isArray(assignees)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Assignees must be an array",
            });
        }

        try {
            const assigneeIds = assignees.map((assignee: string) => new Types.ObjectId(assignee));
            const result = await taskService.updateAssignees(id, assigneeIds);
            res.status(StatusCodes.OK).json({
                success: true,
                message: "Assignees updated successfully",
                data: result,
            });
        } catch (error: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error updating assignees",
                error: error.message
            });
        }
    }
}; 
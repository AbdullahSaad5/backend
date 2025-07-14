import { z } from "zod";

export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
    start: z.string().datetime("Start date must be a valid date"),
    end: z.string().datetime("End date must be a valid date"),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
    status: z.enum(["To Do", "InProgress", "Completed"]).default("To Do"),
    description: z.string().min(1, "Description is required").max(1000, "Description cannot exceed 1000 characters"),
    assignees: z.array(z.string().min(1, "Assignee ID is required")).min(1, "At least one assignee is required"),
});

export const updateTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters").optional(),
    start: z.string().datetime("Start date must be a valid date").optional(),
    end: z.string().datetime("End date must be a valid date").optional(),
    priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
    status: z.enum(["To Do", "InProgress", "Completed"]).optional(),
    description: z.string().min(1, "Description is required").max(1000, "Description cannot exceed 1000 characters").optional(),
    assignees: z.array(z.string().min(1, "Assignee ID is required")).min(1, "At least one assignee is required").optional(),
});

export const updateTaskStatusSchema = z.object({
    status: z.enum(["To Do", "InProgress", "Completed"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be one of: To Do, InProgress, Completed",
    }),
});

export const updateTaskPrioritySchema = z.object({
    priority: z.enum(["Low", "Medium", "High", "Urgent"], {
        required_error: "Priority is required",
        invalid_type_error: "Priority must be one of: Low, Medium, High, Urgent",
    }),
});

export const updateTaskAssigneesSchema = z.object({
    assignees: z.array(z.string().min(1, "Assignee ID is required")).min(1, "At least one assignee is required"),
}); 
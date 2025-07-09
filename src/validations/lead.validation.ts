import { z } from "zod";

export const createLeadValidation = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    email: z.string().email("Invalid email format").max(100, "Email cannot exceed 100 characters"),
    phoneNumber: z.string().max(20, "Phone number cannot exceed 20 characters").optional(),
    source: z.string().max(100, "Source cannot exceed 100 characters").optional(),
    assignedTo: z.string().optional(),
    leadCategory: z.string().min(1, "Lead category is required"),
});

export const updateLeadValidation = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").optional(),
    email: z.string().email("Invalid email format").max(100, "Email cannot exceed 100 characters").optional(),
    phoneNumber: z.string().max(20, "Phone number cannot exceed 20 characters").optional(),
    source: z.string().max(100, "Source cannot exceed 100 characters").optional(),
    assignedTo: z.string().optional(),
    leadCategory: z.string().min(1, "Lead category is required").optional(),
});

export const updateLeadStatusValidation = z.object({
    status: z.enum(["new", "Contacted", "Converted", "Lost"], {
        errorMap: () => ({ message: "Status must be one of: new, Contacted, Converted, Lost" }),
    }),
}); 
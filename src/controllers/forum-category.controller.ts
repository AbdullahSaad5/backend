// src/controllers/forumCategory.controller.ts
import { CategoryModel } from "@/models/forumcategory.modal";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const CategoryController = {
    // Create a new category
    createCategory: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Name is required"
                });
            }

            const newCategory = await CategoryModel.create({ name });

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Category created successfully",
                data: newCategory
            });
        } catch (error: any) {
            console.error("Category creation error:", error);

            if (error.name === "ValidationError") {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error creating category",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    // Get all categories
    getAllCategories: async (req: Request, res: Response) => {
        try {
            const categories = await CategoryModel.find().sort({ createdAt: -1 });
            res.status(StatusCodes.OK).json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error("Error fetching categories:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error fetching categories"
            });
        }
    },

    // Get a single category by ID
    getCategoryById: async (req: Request, res: Response) => {
        try {
            const category = await CategoryModel.findById(req.params.id);

            if (!category) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                data: category
            });
        } catch (error) {
            console.error("Error fetching category:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error fetching category"
            });
        }
    },

    // Update a category
    updateCategory: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const updatedCategory = await CategoryModel.findByIdAndUpdate(
                id,
                { name },
                { new: true, runValidators: true }
            );

            if (!updatedCategory) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Category updated successfully",
                data: updatedCategory
            });
        } catch (error: any) {
            console.error("Error updating category:", error);

            if (error.name === "ValidationError") {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error updating category"
            });
        }
    },

    // Delete a category
    deleteCategory: async (req: Request, res: Response) => {
        try {
            const deletedCategory = await CategoryModel.findByIdAndDelete(req.params.id);

            if (!deletedCategory) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Category deleted successfully"
            });
        } catch (error) {
            console.error("Error deleting category:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error deleting category"
            });
        }
    }
};
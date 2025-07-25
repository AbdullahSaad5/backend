import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { LeadsCategoryService } from "@/services/leadscategory.service";

export const LeadsCategoryController = {
    /**
     * @desc    Create a new Leads category
     * @route   POST /api/leads-categories
     * @access  Private/Admin
     */
    createLeadsCategory: async (req: Request, res: Response) => {
        try {
            const { title, description, image } = req.body;

            if (!title || !description) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Title and description are required fields"
                });
            }

            const newCategory = await LeadsCategoryService.createLeadsCategory(
                title,
                description,
                image,
            );

            res.status(StatusCodes.CREATED).json({
                success: true,
                message: "Leads category created successfully",
                data: newCategory
            });
        } catch (error: any) {
            if (error.name === "MongoServerError" && error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
                });
            } else {
                console.error("Error creating Leads category:", error);
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: "Error creating Leads category"
                });
            }
        }
    },

    /**
     * @desc    Update a Leads category
     * @route   PUT /api/leads-categories/:id
     * @access  Private/Admin
     */
    updateLeadsCategory: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, description, image, isBlocked } = req.body;

            if (!id) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Category ID is required"
                });
            }

            const updateData: {
                title?: string;
                description?: string;
                image?: string;
                isBlocked?: boolean;
            } = {};

            if (title) updateData.title = title;
            if (description) updateData.description = description;
            if (image) updateData.image = image;
            if (typeof isBlocked !== 'undefined') updateData.isBlocked = isBlocked;

            const updatedCategory = await LeadsCategoryService.editLeadsCategory(id, updateData);

            if (!updatedCategory) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Leads category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Leads category updated successfully",
                data: updatedCategory
            });
        } catch (error: any) {
            if (error.name === "MongoServerError" && error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
                });
            } else {
                console.error("Error updating Leads category:", error);
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: "Error updating Leads category"
                });
            }
        }
    },

    /**
     * @desc    Delete a Leads category
     * @route   DELETE /api/leads-categories/:id
     * @access  Private/Admin
     */
    deleteLeadsCategory: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Category ID is required"
                });
            }

            const deletedCategory = await LeadsCategoryService.deleteLeadsCategory(id);

            if (!deletedCategory) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Leads category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Leads category deleted successfully",
                data: deletedCategory
            });
        } catch (error) {
            console.error("Error deleting Leads category:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error deleting Leads category"
            });
        }
    },

    /**
     * @desc    Get all Leads categories
     * @route   GET /api/leads-categories
     * @access  Public
     */
    getAllLeadsCategories: async (req: Request, res: Response) => {
        try {
            const { isBlocked } = req.query;

            const filter: { isBlocked?: boolean } = {};
            if (isBlocked !== undefined) {
                filter.isBlocked = isBlocked === 'true';
            }

            const categories = await LeadsCategoryService.getAllLeadsCategories();

            res.status(StatusCodes.OK).json({
                success: true,
                count: categories.length,
                data: categories
            });
        } catch (error) {
            console.error("Error getting Leads categories:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error getting Leads categories"
            });
        }
    },

    /**
     * @desc    Get single Leads category by ID
     * @route   GET /api/leads-categories/:id
     * @access  Public
     */
    getLeadsCategoryById: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: "Category ID is required"
                });
            }

            const category = await LeadsCategoryService.getById(id);

            if (!category) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: "Leads category not found"
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                data: category
            });
        } catch (error) {
            console.error("Error getting Leads category:", error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Error getting Leads category"
            });
        }
    },
}; 
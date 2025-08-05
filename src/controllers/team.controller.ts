import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { teamService } from "@/services/team.service";

export const teamController = {
  // Get all teams
  getAllTeams: async (req: Request, res: Response) => {
    try {
      const teams = await teamService.getAllTeams();
      res.status(StatusCodes.OK).json({
        success: true,
        data: teams,
      });
    } catch (error) {
      console.error("Get All Teams Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching teams",
        error: error,
      });
    }
  },

  // Get teams by category
  getTeamsByCategory: async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const teams = await teamService.getTeamsByCategory(categoryId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: teams,
      });
    } catch (error) {
      console.error("Get Teams By Category Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching teams by category",
        error: error,
      });
    }
  },

  // Create new team
  createTeam: async (req: Request, res: Response) => {
    try {
      const { name, userCategoryId, description } = req.body;

      const newTeam = await teamService.createTeam({
        name,
        userCategoryId,
        description,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Team created successfully",
        data: newTeam,
      });
    } catch (error: any) {
      console.error("Create Team Error:", error);
      if (error.name === "MongoServerError" && error.code === 11000) {
        // Handle duplicate key error
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "A team with this name already exists in this category",
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Error creating team",
          error: error.message,
        });
      }
    }
  },

  // Get specific team by ID
  getTeamById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const team = await teamService.getTeamById(id);
      
      if (!team) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Team not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: team,
      });
    } catch (error) {
      console.error("Get Team By ID Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching team",
        error: error,
      });
    }
  },

  // Update team
  updateTeam: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;

      const updatedTeam = await teamService.updateTeam(id, {
        name,
        description,
        isActive,
      });

      if (!updatedTeam) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Team not found",
        });
      }

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Team updated successfully",
        data: updatedTeam,
      });
    } catch (error: any) {
      console.error("Update Team Error:", error);
      if (error.name === "MongoServerError" && error.code === 11000) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "A team with this name already exists",
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Error updating team",
          error: error.message,
        });
      }
    }
  },

  // Delete team
  deleteTeam: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deletedTeam = await teamService.deleteTeam(id);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Team deleted successfully",
        data: deletedTeam,
      });
    } catch (error: any) {
      console.error("Delete Team Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error deleting team",
      });
    }
  },

  // Toggle team status (active/inactive)
  toggleStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const updatedTeam = await teamService.toggleStatus(id, isActive);

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Team ${isActive ? "activated" : "deactivated"} successfully`,
        data: updatedTeam,
      });
    } catch (error: any) {
      console.error("Toggle Team Status Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating team status",
      });
    }
  },

  // Toggle team block status (for StatusToggle component compatibility)
  toggleBlock: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;

      // Convert isBlocked to isActive (inverse relationship)
      const isActive = !isBlocked;
      const updatedTeam = await teamService.toggleStatus(id, isActive);

      if (!updatedTeam) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Team not found",
        });
      }

      // Create response compatible with StatusToggle component
      const responseData = {
        ...updatedTeam.toObject(),
        isBlocked: !updatedTeam.isActive, // Convert isActive to isBlocked
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: `Team ${isBlocked ? "blocked" : "activated"} successfully`,
        data: responseData,
        isBlocked: !updatedTeam.isActive, // Also include at root level for compatibility
      });
    } catch (error: any) {
      console.error("Toggle Team Block Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Error updating team status",
      });
    }
  },
};

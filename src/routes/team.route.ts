import { Router } from "express";
import { teamController } from "@/controllers/team.controller";
import { teamValidation } from "@/validations/team.validation";

export const team = (router: Router) => {
  // Create team
  router.post("/", teamValidation.createTeam, teamController.createTeam);

  // Get all teams
  router.get("/", teamController.getAllTeams);

  // Get teams by category
  router.get("/category/:categoryId",  teamController.getTeamsByCategory);

  // Get specific team by ID
  router.get("/:id",  teamController.getTeamById);

  // Update team
  router.patch("/:id",  teamValidation.updateTeam, teamController.updateTeam);

  // Delete team
  router.delete("/:id", teamValidation.validateId, teamController.deleteTeam);

  // Toggle team status
  router.patch("/status/:id", teamValidation.validateId, teamController.toggleStatus);

  // Block/Unblock team (for StatusToggle component compatibility)
  router.patch("/block/:id", teamValidation.validateId, teamController.toggleBlock);
};

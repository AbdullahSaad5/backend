import { Router } from "express";
import { userController } from "@/controllers";
import { userValidation } from "@/validations";
import { authGuard } from "@/guards";

export const user = (router: Router) => {
  // route for create new user
  router.post("/", userValidation.createUser, userController.createUser);
  // route for get all users
  router.get("/", authGuard.isAuth as any, userController.allUsers);

  // Router for get all users with specific role
  router.get("/role/:role", userController.getUsersByRole);

  //new route for search and filter and pagination
  router.get("/search", userController.searchAndFilterUsers);
  // New route for fetching user stats/ Widgets
  router.get("/stats", userController.getUserStats);

  // route for get details (include permissions) of specific user by id
  router.get("/:id", userValidation.validateId, userController.getUserDetails);

  router.get("/address/:id", userController.getUserAddress);

  // Address management routes
  router.post("/:userId/address", userController.addUserAddress);
  router.delete("/:userId/address/:addressId", userController.deleteUserAddress);
  router.patch("/:userId/address/:addressId/default", userController.setDefaultAddress);

  // route for update user
  router.patch("/:id", userValidation.updateUser, userController.updateUser);

  // route for delete user using id
  router.delete("/:id", userValidation.validateId, userController.deleteUser);

  // route for update user
  router.patch("/escalate/:id", userValidation.updateUser, userController.updateUser);
  // route for toggle block status
  router.patch("/block/:id", userController.toggleBlock);

  router.patch("/permissions/:id", userController.updatePermissions);

  // Profile Completion Routes
  router.get("/:id/profile-status", userValidation.validateId, userController.getProfileCompletionStatus);
  router.patch(
    "/:id/profile-completion",
    userValidation.validateId,
    userValidation.profileCompletion,
    userController.updateProfileCompletion
  );

  // Team Assignment Routes
  router.patch("/:id/assign-teams", userValidation.validateId, userController.assignTeams);
  router.get("/:id/teams", userValidation.validateId, userController.getUserWithTeams);
  router.delete("/:userId/teams/:teamId", userValidation.validateId, userController.removeTeam);
};

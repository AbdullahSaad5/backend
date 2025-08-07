import { Router } from "express";
import { productTypeWorkflowController } from "@/controllers/product-type-workflow.controller";
import { authGuard } from "@/guards";

export const productTypeWorkflow = (router: Router) => {
  // Create a new workflow
  router.post("/", authGuard.isAuth, productTypeWorkflowController.createWorkflow);

  // Get all workflows
  router.get("/", authGuard.isAuth, productTypeWorkflowController.getAllWorkflows);

  // Get active workflows only
  router.get("/active", authGuard.isAuth, productTypeWorkflowController.getActiveWorkflows);

  // Get workflows by category
  router.get("/category/:categoryId", authGuard.isAuth, productTypeWorkflowController.getWorkflowsByCategory);

  // Get workflow by ID
  router.get("/:id", authGuard.isAuth, productTypeWorkflowController.getWorkflowById);

  // Get workflow by workflowId
  router.get("/workflow/:workflowId", authGuard.isAuth, productTypeWorkflowController.getWorkflowByWorkflowId);

  // Update workflow
  router.put("/:id", authGuard.isAuth, productTypeWorkflowController.updateWorkflow);

  // Toggle workflow status
  router.patch("/:id/toggle", authGuard.isAuth, productTypeWorkflowController.toggleWorkflowStatus);

  // Delete workflow
  router.delete("/:id", authGuard.isAuth, productTypeWorkflowController.deleteWorkflow);
};

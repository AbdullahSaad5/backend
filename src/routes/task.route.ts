import { taskController } from "@/controllers/task.controller";
import { Router } from "express";

export const task = (router: Router) => {
    router.post("/", taskController.createTask);
    router.get("/", taskController.getAllTasks);
    router.patch("/:id", taskController.editTask);
    router.delete("/:id", taskController.deleteTask);
    router.get("/:id", taskController.getSpecificTask);
    router.patch("/:id/status", taskController.toggleTaskStatus);
    router.patch("/:id/priority", taskController.togglePriorityStatus);
    router.patch("/:id/assignees", taskController.updateAssignees);
}; 
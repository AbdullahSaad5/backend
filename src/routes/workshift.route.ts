import { Router } from "express";
import { shiftController } from "@/controllers/workshift.controller";
// import { authenticate, authorize } from "../middlewares/auth.middleware"; // Assuming you have auth middleware
export const workshift = (router: Router) => {
  // Create a new shift
  // router.post("/", authenticate, authorize(["admin", "manager"]), shiftController.createShift);
  router.post("/", shiftController.createShift);

  router.post("/assign", shiftController.assignShift);
  router.get("/", shiftController.getAllShifts);

  router.get("/:id", shiftController.getShiftById);

  router.patch("/:id", shiftController.updateShift);

  router.delete("/:id", shiftController.deleteShift);

  router.get("/employee/:employeeId", shiftController.getShiftsByEmployee);
};

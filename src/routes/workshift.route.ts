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

  // Update shift
  router.patch("/:id", shiftController.patchShiftEmployees);

  // router.put("/:id", authenticate, authorize(["admin", "manager"]), shiftController.updateShift);

  // router.delete("/:id", authenticate, authorize(["admin", "manager"]), shiftController.deleteShift);
  router.delete("/:id", shiftController.deleteShift);

  // Get shifts for a specific employee
  router.get("/employee/:employeeId", shiftController.getShiftsByEmployee);
  // router.get("/employee/:employeeId", authenticate, shiftController.getShiftsByEmployee);
};

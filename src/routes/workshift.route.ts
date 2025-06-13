import express, { Router } from "express";
import { shiftController } from "@/controllers/workshift.controller";
// import { authenticate, authorize } from "../middlewares/auth.middleware"; // Assuming you have auth middleware
export const workshift = (router: Router)=>{

// Create a new shift
// router.post("/", authenticate, authorize(["admin", "manager"]), shiftController.createShift);
router.post("/",  shiftController.createShift);

// Get all shifts
// router.get("/", authenticate, shiftController.getAllShifts);
router.get("/", shiftController.getAllShifts);

// Get shift by ID
// router.get("/:id", authenticate, shiftController.getShiftById);
router.get("/:id",  shiftController.getShiftById);

// Update shift
router.patch("/:id", shiftController.updateShift);
// router.put("/:id", authenticate, authorize(["admin", "manager"]), shiftController.updateShift);

// Delete shift
// router.delete("/:id", authenticate, authorize(["admin", "manager"]), shiftController.deleteShift);
router.delete("/:id",  shiftController.deleteShift);

// Get shifts for a specific employee
router.get("/employee/:employeeId", shiftController.getShiftsByEmployee);
// router.get("/employee/:employeeId", authenticate, shiftController.getShiftsByEmployee);

}
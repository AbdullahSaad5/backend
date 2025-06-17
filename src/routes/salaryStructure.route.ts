// src/routes/salaryStructure.route.ts
import { Router } from "express";
import { SalaryStructureController } from "@/controllers/salaryStructure.controller";

export const salaryStructure = (router: Router) => {
  router.post("/", SalaryStructureController.createSalaryStructure);
  router.patch("/:id", SalaryStructureController.updateSalaryStructure);
  router.delete("/:id", SalaryStructureController.deleteSalaryStructure);
  router.get("/", SalaryStructureController.getAllSalaryStructures);
  router.get("/:id", SalaryStructureController.getSalaryStructureById);
  router.get("/position/:position", SalaryStructureController.getSalaryStructureByPosition);
  router.patch("/block/:id", SalaryStructureController.updateSalaryStructure);
};
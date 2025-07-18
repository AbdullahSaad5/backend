// src/routes/leadscategory.route.ts
import { Router } from "express";
import { LeadsCategoryController } from "@/controllers/leadscategory.controller";

export const leadscategory = (router: Router) => {
    router.post(
        "/",
        LeadsCategoryController.createLeadsCategory
    );

    router.get("/", LeadsCategoryController.getAllLeadsCategories);

    router.patch(
        "/:id",
        LeadsCategoryController.updateLeadsCategory
    );

    router.patch(
        "/block/:id",
        LeadsCategoryController.updateLeadsCategory
    );

    router.delete(
        "/:id",
        LeadsCategoryController.deleteLeadsCategory
    );

    router.get(
        "/:id",
        LeadsCategoryController.getLeadsCategoryById
    );
}; 
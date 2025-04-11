import { permissionsController } from "@/controllers";
import { Router } from "express";

export const permissions = (router: Router) => {

    router.get("/" , permissionsController.getPermissions)

}
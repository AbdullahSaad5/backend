import { workshiftController } from "@/controllers/workshift.controller";
import { Router } from "express";

export const workshift =(router: Router)=>{
    router.post("/", workshiftController.createworkshift)
}
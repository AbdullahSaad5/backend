import { postagePolicyController } from "@/controllers";
import { Router } from "express";



export const postagePolicy = (router: Router) => {

    router.post("/" , postagePolicyController.createPostagePolicy);

    router.get("/" , postagePolicyController.getAllPostagePolicy);

    router.get("/:id" ,  postagePolicyController.getSpecificPolicy)

    router.patch("/:id" , postagePolicyController.editPolicy)

    router.delete("/:id" , postagePolicyController.deletePolicy)

}


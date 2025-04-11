import { Router } from "express";
import { userCategoryController } from "@/controllers";
import { userCategoryValidation } from "@/validations";


export const userCategory = (router: Router) => {

    router.post("/", userCategoryValidation.createUserCategory , userCategoryController.createUserCategory); 

    router.get("/" , userCategoryController.allUsersCategories)

    router.patch("/:id" , userCategoryValidation.updateUserCategory , userCategoryController.editCategory)

    router.delete("/:id" , userCategoryValidation.validateId , userCategoryController.deleteCategory)

    router.get("/:id" , userCategoryValidation.validateId , userCategoryController.getSpecificCategory)

    router.patch("/block/:id" , userCategoryValidation.validateId , userCategoryController.toggleBlock)

}

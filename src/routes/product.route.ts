import { productController } from "@/controllers";
import { productValidation } from "@/validations";
import { Router } from "express";


export const product = (router: Router) => {

    router.post("/", productValidation.addProduct , productController.addProduct);

    router.get("/", productController.getAllProduct);

    router.get("/:id" , productValidation.validateId , productController.getProductById);

    // router.delete("/:id" , productValidation.validateId , productController.deleteProduct)

    router.patch("/:id" , productValidation.updateProduct , productController.updateProductById)

    // route for toggle block status
    router.patch("/block/:id" , productController.toggleBlock)

}
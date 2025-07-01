import { documentController } from "@/controllers/documents.controller";
import { Router } from "express";

export const document = (router: Router) => {
    router.post(
        "/",
        documentController.createDocument
    );

    router.get(
        "/",
        documentController.getAllDocuments
    );

    router.get(
        "/:id",
        documentController.getDocumentById
    );

    router.patch(
        "/:id",
        documentController.updateDocument
    );

    router.delete(
        "/:id",
        documentController.deleteDocument
    );

    router.get(
        "/category/:category",
        documentController.getDocumentsByCategory
    );

    router.get(
        "/search",
        documentController.searchDocuments
    );

     router.get(
        "/my-documents",
        documentController.getMyDocuments
    );
  
    return router;
};

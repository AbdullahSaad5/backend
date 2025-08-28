import { documentController } from "@/controllers/documents.controller";
import { Router } from "express";

export const document = (router: Router) => {
  router.post("/", documentController.createDocument);

  router.get("/", documentController.getAllDocuments);

  router.get("/:id", documentController.getDocumentById);

  // Get document with version history
  router.get("/:id/with-versions", documentController.getDocumentWithVersions);

  // Version history routes
  router.get("/:id/versions", documentController.getDocumentVersionHistory);
  
  router.get("/:id/versions/:versionId", documentController.getDocumentVersion);
  
  router.post("/:id/versions/:versionId/restore", documentController.restoreDocumentVersion);

  // Version validation routes
  router.get("/:id/validate-version", documentController.validateVersionNumber);
  
  router.post("/:id/check-changes", documentController.checkDocumentChanges);

  router.patch("/:id", documentController.updateDocument);

  router.patch("/:id/version", documentController.updateDocumentVersion);

  router.delete("/:id", documentController.deleteDocument);

  router.get("/category/:category", documentController.getDocumentsByCategory);

  router.get("/search", documentController.searchDocuments);

  router.get("/my-documents", documentController.getMyDocuments);

  router.get("/download/:id", documentController.downloadDocument);

  return router;
};

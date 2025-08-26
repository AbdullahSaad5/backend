import { Request, Response } from "express";
import { documentService } from "../services/document.service";
import { documentVersionService } from "../services/document-version.service";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { jwtVerify } from "@/utils/jwt.util";
import fetch from "node-fetch";

// Helper: extract extension from a URL
function getFileExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split(".").pop();
    return extension || "file";
  } catch {
    return "file";
  }
}

// Helper: extract extension from a filename
function getFileExtensionFromName(name: string): string {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts.pop() as string;
}

// Helper: ensure filename has an extension
function ensureFilenameHasExtension(name: string, ext?: string): string {
  const safeName = name.trim();
  if (!ext) return safeName;
  const hasExt = /\.[A-Za-z0-9]+$/.test(safeName);
  return hasExt ? safeName : `${safeName}.${ext}`;
}

// Helper: basic mime type guessing
function guessMimeTypeFromExtension(ext?: string | null): string | undefined {
  if (!ext) return undefined;
  const normalized = ext.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    json: "application/json",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
  };
  return map[normalized] || undefined;
}

// Helper: detect when to override upstream content type
function shouldOverrideContentType(
  upstream: string,
  guessed?: string
): boolean {
  if (!guessed) return false;
  if (!upstream) return true;
  const lower = upstream.toLowerCase();
  if (lower.startsWith("text/plain") || lower === "application/octet-stream")
    return true;
  return false;
}

// Helper: sanitize filename for header
function sanitizeFilename(name: string): string {
  return name.replace(/\r|\n|\"/g, "").trim();
}

export const documentController = {
  // Create a new document
  createDocument: async (req: any, res: Response) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authorization token is required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id; // Get from token

      // Remove userId from body if present
      const { userId: _, ...documentData } = req.body;

      const newDocument = await documentService.createDocument({
        ...documentData,
        userId, // Set from token
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: newDocument,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error creating document",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get all documents
  getAllDocuments: async (req: Request, res: Response) => {
    try {
      const documents = await documentService.getAllDocuments();
      res.status(StatusCodes.OK).json({
        success: true,
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching documents",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get document by ID
  getDocumentById: async (req: Request, res: Response) => {
    try {
      const document = await documentService.getDocumentById(req.params.id);
      if (!document) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: document,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching document",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Update document with version control
  updateDocument: async (req: Request, res: Response) => {
    try {
      const { versionNotes, ...documentData } = req.body;
      
      const updatedDocument = await documentService.updateDocument(
        req.params.id,
        documentData,
        versionNotes
      );
      
      if (!updatedDocument) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }
      
      res.status(StatusCodes.OK).json({
        success: true,
        data: updatedDocument,
        message: "Document updated successfully"
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating document",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Update document version
  updateDocumentVersion: async (req: Request, res: Response) => {
    try {
      const { version } = req.body;
      if (!version || typeof version !== "string") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Version is required and must be a string",
        });
      }

      const updatedDocument = await documentService.updateDocumentVersion(
        req.params.id,
        version
      );
      if (!updatedDocument) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: updatedDocument,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error updating document version",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Delete document
  deleteDocument: async (req: Request, res: Response) => {
    try {
      const deletedDocument = await documentService.deleteDocument(
        req.params.id
      );
      if (!deletedDocument) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Document deleted successfully",
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error deleting document",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get documents by category
  getDocumentsByCategory: async (req: Request, res: Response) => {
    try {
      const documents = await documentService.getDocumentsByCategory(
        req.params.category
      );
      res.status(StatusCodes.OK).json({
        success: true,
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching documents by category",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Search documents by title or tags
  searchDocuments: async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Search query is required",
        });
      }
      const documents = await documentService.searchDocuments(query);
      res.status(StatusCodes.OK).json({
        success: true,
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error searching documents",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get documents visible to current user
  getMyDocuments: async (req: any, res: Response) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authorization token is required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString(); // Convert to string

      const documents = await documentService.getDocumentsVisibleToUser(userId);
      res.status(StatusCodes.OK).json({
        success: true,
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user documents",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get documents created by current user
  getUserDocuments: async (req: any, res: Response) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Authorization token is required",
        });
      }

      const decoded = jwtVerify(token);
      const userId = decoded.id.toString(); // Convert to string

      const documents = await documentService.getDocumentsByUser(userId);
      res.status(StatusCodes.OK).json({
        success: true,
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching user documents",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Download document
  downloadDocument: async (req: Request, res: Response) => {
    try {
      const document = await documentService.getDocumentForDownload(
        req.params.id
      );
      if (!document) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }

      // Check if document is expired
      if (document.expiryDate && new Date(document.expiryDate) < new Date()) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Document has expired and cannot be downloaded",
        });
      }

      // Check if document has a file
      if (
        !document.document ||
        !document.document[0] ||
        !document.document[0].url
      ) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "File not found for this document",
        });
      }

      const fileUrl = document.document[0].url;
      const originalName =
        document.document[0].name || document.docTitle || "download";
      const urlExt = getFileExtensionFromUrl(fileUrl);
      const nameExt = getFileExtensionFromName(originalName);
      const chosenExt = nameExt || urlExt;
      const fileName = ensureFilenameHasExtension(originalName, chosenExt);

      try {
        // Fetch the file from the URL
        const response = await fetch(fileUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        // Get file content as buffer
        const fileBuffer = await response.buffer();

        // Set appropriate headers for download
        const upstreamContentType = response.headers.get("content-type") || "";
        const guessedContentType = guessMimeTypeFromExtension(
          getFileExtensionFromName(fileName)
        );
        const resolvedContentType: string = shouldOverrideContentType(
          upstreamContentType,
          guessedContentType
        )
          ? guessedContentType || "application/octet-stream"
          : upstreamContentType ||
            guessedContentType ||
            "application/octet-stream";

        const finalContentType: string =
          resolvedContentType || "application/octet-stream";
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${sanitizeFilename(fileName)}"`
        );
        res.setHeader("Content-Type", finalContentType);
        res.setHeader("Content-Length", fileBuffer.length);
        res.setHeader("Cache-Control", "no-cache");

        // Send the file
        res.send(fileBuffer);
      } catch (fetchError) {
        console.error("Error fetching file:", fetchError);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Error downloading file from storage",
          error: fetchError instanceof Error ? fetchError.message : fetchError,
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error downloading document",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get document with version history
  getDocumentWithVersions: async (req: Request, res: Response) => {
    try {
      const document = await documentService.getDocumentWithVersionInfo(req.params.id);
      if (!document) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: document,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching document with versions",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get version history for a document
  getDocumentVersionHistory: async (req: Request, res: Response) => {
    try {
      const versions = await documentVersionService.getVersionHistory(req.params.id);
      res.status(StatusCodes.OK).json({
        success: true,
        count: versions.length,
        data: versions,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching version history",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Get specific version by ID
  getDocumentVersion: async (req: Request, res: Response) => {
    try {
      const version = await documentVersionService.getVersionById(req.params.versionId);
      if (!version) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Version not found",
        });
      }
      res.status(StatusCodes.OK).json({
        success: true,
        data: version,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error fetching version",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Restore a specific version
  restoreDocumentVersion: async (req: Request, res: Response) => {
    try {
      const restoredVersion = await documentVersionService.restoreVersion(req.params.versionId);
      res.status(StatusCodes.OK).json({
        success: true,
        data: restoredVersion,
        message: "Version restored successfully",
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error restoring version",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Validate version number
  validateVersionNumber: async (req: Request, res: Response) => {
    try {
      const { currentVersion, newVersion } = req.query;
      
      if (!currentVersion || !newVersion) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "Both currentVersion and newVersion are required",
        });
      }

      const isValid = documentVersionService.validateVersionNumber(
        currentVersion as string, 
        newVersion as string
      );

      // Check if version already exists for this document
      const documentId = req.params.id;
      const versionExists = await documentVersionService.versionExists(
        documentId, 
        newVersion as string
      );

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          isValidVersion: isValid,
          versionExists: versionExists,
          canUseVersion: isValid && !versionExists
        },
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error validating version",
        error: error instanceof Error ? error.message : error,
      });
    }
  },

  // Check if document has changes
  checkDocumentChanges: async (req: Request, res: Response) => {
    try {
      const currentDoc = await documentService.getDocumentById(req.params.id);
      if (!currentDoc) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Document not found",
        });
      }

      const hasChanges = documentService.hasDocumentChanges(currentDoc, req.body);
      
      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          hasChanges: hasChanges,
          requiresNewVersion: hasChanges
        },
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error checking document changes",
        error: error instanceof Error ? error.message : error,
      });
    }
  },
};

import { Request, Response } from 'express';
import { documentService } from "../services/document.service";
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { jwtVerify } from "@/utils/jwt.util";
import fetch from 'node-fetch';

export const documentController = {
    // Create a new document
    createDocument: async (req: any, res: Response) => {
        try {
            const token = req.headers["authorization"]?.split(" ")[1];
            if (!token) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authorization token is required'
                });
            }

            const decoded = jwtVerify(token);
            const userId = decoded.id; // Get from token

            // Remove userId from body if present
            const { userId: _, ...documentData } = req.body;

            const newDocument = await documentService.createDocument({
                ...documentData,
                userId // Set from token
            });

            res.status(StatusCodes.CREATED).json({
                success: true,
                data: newDocument
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error creating document',
                error: error instanceof Error ? error.message : error
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
                data: documents
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error fetching documents',
                error: error instanceof Error ? error.message : error
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
                    message: 'Document not found'
                });
            }
            res.status(StatusCodes.OK).json({
                success: true,
                data: document
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error fetching document',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Update document
    updateDocument: async (req: Request, res: Response) => {
        try {
            const updatedDocument = await documentService.updateDocument(
                req.params.id,
                req.body
            );
            if (!updatedDocument) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Document not found'
                });
            }
            res.status(StatusCodes.OK).json({
                success: true,
                data: updatedDocument
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error updating document',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Update document version
    updateDocumentVersion: async (req: Request, res: Response) => {
        try {
            const { version } = req.body;
            if (!version || typeof version !== 'string') {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Version is required and must be a string'
                });
            }

            const updatedDocument = await documentService.updateDocumentVersion(
                req.params.id,
                version
            );
            if (!updatedDocument) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Document not found'
                });
            }
            res.status(StatusCodes.OK).json({
                success: true,
                data: updatedDocument
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error updating document version',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Delete document
    deleteDocument: async (req: Request, res: Response) => {
        try {
            const deletedDocument = await documentService.deleteDocument(req.params.id);
            if (!deletedDocument) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Document not found'
                });
            }
            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Document deleted successfully'
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error deleting document',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Get documents by category
    getDocumentsByCategory: async (req: Request, res: Response) => {
        try {
            const documents = await documentService.getDocumentsByCategory(req.params.category);
            res.status(StatusCodes.OK).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error fetching documents by category',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Search documents by title or tags
    searchDocuments: async (req: Request, res: Response) => {
        try {
            const { query } = req.query;
            if (!query || typeof query !== 'string') {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Search query is required'
                });
            }
            const documents = await documentService.searchDocuments(query);
            res.status(StatusCodes.OK).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error searching documents',
                error: error instanceof Error ? error.message : error
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
                    message: 'Authorization token is required'
                });
            }

            const decoded = jwtVerify(token);
            const userId = decoded.id.toString(); // Convert to string

            const documents = await documentService.getDocumentsVisibleToUser(userId);
            res.status(StatusCodes.OK).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error fetching user documents',
                error: error instanceof Error ? error.message : error
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
                    message: 'Authorization token is required'
                });
            }

            const decoded = jwtVerify(token);
            const userId = decoded.id.toString(); // Convert to string

            const documents = await documentService.getDocumentsByUser(userId);
            res.status(StatusCodes.OK).json({
                success: true,
                count: documents.length,
                data: documents
            });
        } catch (error) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error fetching user documents',
                error: error instanceof Error ? error.message : error
            });
        }
    },

    // Download document
    downloadDocument: async (req: Request, res: Response) => {
        try {
            const document = await documentService.getDocumentForDownload(req.params.id);
            if (!document) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            // Check if document is expired
            if (document.expiryDate && new Date(document.expiryDate) < new Date()) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: 'Document has expired and cannot be downloaded'
                });
            }

            // Check if document has a file
            if (!document.document || !document.document[0] || !document.document[0].url) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'File not found for this document'
                });
            }

            const fileUrl = document.document[0].url;
            const fileName = document.document[0].name || `${document.docTitle}.${getFileExtensionFromUrl(fileUrl)}`;

            try {
                // Fetch the file from the URL
                const response = await fetch(fileUrl);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`);
                }

                // Get file content as buffer
                const fileBuffer = await response.buffer();
                
                // Set appropriate headers for download
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
                res.setHeader('Content-Length', fileBuffer.length);
                res.setHeader('Cache-Control', 'no-cache');
                
                // Send the file
                res.send(fileBuffer);
            } catch (fetchError) {
                console.error('Error fetching file:', fetchError);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'Error downloading file from storage',
                    error: fetchError instanceof Error ? fetchError.message : fetchError
                });
            }
        } catch (error) {
            console.error('Download error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Error downloading document',
                error: error instanceof Error ? error.message : error
            });
        }
    }

};

// Helper function to extract file extension from URL
function getFileExtensionFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const extension = pathname.split('.').pop();
        return extension || 'file';
    } catch {
        return 'file';
    }
}

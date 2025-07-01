import { Request, Response } from 'express';
import { documentService } from "../services/document.service";
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';

export const documentController = {
    // Create a new document
    createDocument: async (req: Request, res: Response) => {
        try {
            const newDocument = await documentService.createDocument(req.body);
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
    getMyDocuments: async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            // const userId = req.user?.id;
            if (!userId) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

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
    }
};
   
  
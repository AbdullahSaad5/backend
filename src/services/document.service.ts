import { IDocument } from "@/contracts/document.contract";
import { DocumentModel } from "@/models/document.model";
import { FilterQuery } from "mongoose";

export const documentService = {
    // Create a new document
    createDocument: async (documentData: IDocument) => {
        return await DocumentModel.create(documentData);
    },

    // Get all documents
    getAllDocuments: async () => {
        return await DocumentModel.find();
    },

    // Get document by ID
    getDocumentById: async (id: string) => {
        return await DocumentModel.findById(id);
    },

    // Update document
    updateDocument: async (id: string, updateData: Partial<IDocument>) => {
        return await DocumentModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
    },

    // Delete document
    deleteDocument: async (id: string) => {
        return await DocumentModel.findByIdAndDelete(id);
    },

    // Get documents by category
    getDocumentsByCategory: async (category: string) => {
        return await DocumentModel.find({ docCategory: category });
    },

    // Search documents by title or tags
    searchDocuments: async (query: string) => {
        const searchQuery: FilterQuery<IDocument> = {
            $or: [
                { docTitle: { $regex: query, $options: 'i' } },
                { docTags: { $in: [query] } }
            ]
        };
        return await DocumentModel.find(searchQuery);
    },

    // Additional utility methods
    documentExists: async (id: string) => {
        const doc = await DocumentModel.findById(id);
        return doc !== null;
    }
};
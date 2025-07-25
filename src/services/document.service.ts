import { IDocument } from "@/contracts/document.contract";
import { DocumentModel } from "@/models/document.model";
import { FilterQuery, Types } from "mongoose";

export const documentService = {
    // Create a new document
    createDocument: async (documentData: Omit<IDocument, 'createdAt' | 'updatedAt'>) => {
        const doc = {
            ...documentData,
            version: documentData.version || "1.0.0",
            visibleTo: documentData.visibleTo.map(user => ({
                ...user,
                value: new Types.ObjectId(user.value)
            })),
            userId: new Types.ObjectId(documentData.userId)
        };
        return await DocumentModel.create(doc);
    },

    // Get all documents with populated visibleTo users
    getAllDocuments: async () => {
        return await DocumentModel.find()
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Get document by ID with populated visibleTo users
    getDocumentById: async (id: string) => {
        return await DocumentModel.findById(id)
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Update document
    updateDocument: async (id: string, updateData: Partial<IDocument>) => {
        const dataToUpdate = {
            ...updateData,
            ...(updateData.visibleTo && {
                visibleTo: updateData.visibleTo.map(user => ({
                    ...user,
                    value: new Types.ObjectId(user.value)
                }))
            }),
            ...(updateData.userId && {
                userId: new Types.ObjectId(updateData.userId)
            })
        };

        return await DocumentModel.findByIdAndUpdate(
            id,
            dataToUpdate,
            { new: true }
        )
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Update document version
    updateDocumentVersion: async (id: string, newVersion: string) => {
        return await DocumentModel.findByIdAndUpdate(
            id,
            { version: newVersion },
            { new: true }
        )
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Delete document
    deleteDocument: async (id: string) => {
        return await DocumentModel.findByIdAndDelete(id);
    },

    // Get documents by category
    getDocumentsByCategory: async (category: string) => {
        return await DocumentModel.find({ docCategory: category })
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Search documents by title or tags
    searchDocuments: async (query: string) => {
        const searchQuery: FilterQuery<IDocument> = {
            $or: [
                { docTitle: { $regex: query, $options: 'i' } },
                { docTags: { $in: [query] } }
            ]
        };
        return await DocumentModel.find(searchQuery)
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Get documents visible to a specific user
    getDocumentsVisibleToUser: async (userId: string) => {
        return await DocumentModel.find({
            "visibleTo.value": new Types.ObjectId(userId)
        })
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Get documents created by a specific user
    getDocumentsByUser: async (userId: string) => {
        return await DocumentModel.find({
            userId: new Types.ObjectId(userId)
        })
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });
    },

    // Check if document exists
    documentExists: async (id: string) => {
        const doc = await DocumentModel.findById(id);
        return doc !== null;
    }
};
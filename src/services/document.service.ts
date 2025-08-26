import { IDocument } from "@/contracts/document.contract";
import { DocumentModel } from "@/models/document.model";
import { documentVersionService } from "./document-version.service";
import { FilterQuery, Types } from "mongoose";

export const documentService = {
    // Create a new document
    createDocument: async (documentData: any) => {
        // Transform the data to ensure proper types
        const doc: any = {};
        
        // Copy all fields from documentData
        Object.keys(documentData).forEach(key => {
            if (key === 'visibleTo' && documentData.visibleTo) {
                // Transform visibleTo array to use ObjectIds
                doc.visibleTo = documentData.visibleTo.map((user: any) => ({
                    label: user.label,
                    value: new Types.ObjectId(user.value),
                    role: user.role
                }));
            } else if (key === 'userId' && documentData.userId) {
                // Transform userId to ObjectId
                doc.userId = new Types.ObjectId(documentData.userId);
            } else if (key === 'expiryDate' && documentData.expiryDate) {
                // Ensure expiryDate is a proper Date object
                doc.expiryDate = new Date(documentData.expiryDate);
            } else {
                // Copy other fields as-is
                doc[key] = documentData[key];
            }
        });
        
        // Set default values
        doc.version = documentData.version || "1.0.0";
        doc.totalVersions = 1;
        
        const createdDoc = await DocumentModel.create(doc);
        
        // Create initial version in version history
        await documentVersionService.createInitialVersion(documentData, (createdDoc as any)._id.toString());
        
        return createdDoc;
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

    // Update document with version control
    updateDocument: async (id: string, updateData: any, versionNotes?: string) => {
        console.log('Update Document - Input data:', JSON.stringify(updateData, null, 2));
        
        const currentDoc = await DocumentModel.findById(id);
        if (!currentDoc) {
            throw new Error("Document not found");
        }

        console.log('Current document:', JSON.stringify(currentDoc.toObject(), null, 2));

        // Check if this is actually an update (has changes)
        const hasChanges = documentService.hasDocumentChanges(currentDoc, updateData);
        console.log('Has changes:', hasChanges);
        
        if (!hasChanges) {
            // No changes detected, return current document without creating new version
            return await DocumentModel.findById(id)
                .populate({
                    path: "visibleTo.value",
                    select: "firstName lastName email"
                })
                .populate({
                    path: "userId",
                    select: "firstName lastName email"
                });
        }

        // Validate version number if provided
        if (updateData.version && updateData.version !== currentDoc.version) {
            const isValidVersion = documentVersionService.validateVersionNumber(
                currentDoc.version, 
                updateData.version
            );
            
            if (!isValidVersion) {
                throw new Error(`New version ${updateData.version} must be greater than current version ${currentDoc.version}`);
            }

            // Check if version already exists
            const versionExists = await documentVersionService.versionExists(id, updateData.version);
            if (versionExists) {
                throw new Error(`Version ${updateData.version} already exists for this document`);
            }
        }

        // Transform the data to ensure proper types
        const dataToUpdate: any = {};
        
        // Copy all fields from updateData
        Object.keys(updateData).forEach(key => {
            if (key === 'visibleTo' && updateData.visibleTo) {
                // Transform visibleTo array to use ObjectIds
                dataToUpdate.visibleTo = updateData.visibleTo.map((user: any) => ({
                    label: user.label,
                    value: new Types.ObjectId(user.value),
                    role: user.role
                }));
            } else if (key === 'userId' && updateData.userId) {
                // Transform userId to ObjectId
                dataToUpdate.userId = new Types.ObjectId(updateData.userId);
            } else if (key === 'expiryDate' && updateData.expiryDate) {
                // Ensure expiryDate is a proper Date object
                dataToUpdate.expiryDate = new Date(updateData.expiryDate);
            } else {
                // Copy other fields as-is
                dataToUpdate[key] = updateData[key];
            }
        });
        
        console.log('Transformed data to update:', JSON.stringify(dataToUpdate, null, 2));

        // Update the main document
        let updatedDoc;
        try {
            updatedDoc = await DocumentModel.findByIdAndUpdate(
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
        } catch (updateError: unknown) {
            console.error('Error in findByIdAndUpdate:', updateError);
            const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error occurred';
            throw new Error(`Failed to update document: ${errorMessage}`);
        }

        // Create new version in history
        if (updatedDoc) {
            await documentVersionService.createNewVersion(
                id, 
                updatedDoc.toObject(), 
                versionNotes
            );
        }

        return updatedDoc;
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

    // Delete document and all its versions
    deleteDocument: async (id: string) => {
        // Delete all versions first
        await documentVersionService.deleteDocumentVersions(id);
        
        // Then delete the main document
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
    },

    getDocumentForDownload: async (id: string) => {
        return await DocumentModel.findById(id)
            .select('docTitle document expiryDate')
            .lean(); // Use lean() for better performance since we don't need mongoose document methods
    },

    // Helper function to detect if document has actual changes
    hasDocumentChanges: (currentDoc: any, updateData: any): boolean => {
        // Compare basic fields
        const fieldsToCompare = ['docCategory', 'docTitle', 'author', 'version'];
        
        for (const field of fieldsToCompare) {
            if (updateData[field] !== undefined && updateData[field] !== currentDoc[field]) {
                return true;
            }
        }

        // Compare arrays (docTags)
        if (updateData.docTags && updateData.docTags.length !== currentDoc.docTags.length) {
            return true;
        }
        if (updateData.docTags && !updateData.docTags.every((tag: string, index: number) => 
            tag === currentDoc.docTags[index])) {
            return true;
        }

        // Compare dates
        if (updateData.expiryDate !== undefined) {
            const currentDate = currentDoc.expiryDate ? new Date(currentDoc.expiryDate).toISOString().split('T')[0] : null;
            const newDate = updateData.expiryDate ? new Date(updateData.expiryDate).toISOString().split('T')[0] : null;
            if (currentDate !== newDate) {
                return true;
            }
        }

        // Compare documents array
        if (updateData.document && updateData.document.length !== currentDoc.document.length) {
            return true;
        }
        if (updateData.document && !updateData.document.every((doc: any, index: number) => {
            const currentDocFile = currentDoc.document[index];
            return doc.url === currentDocFile.url && 
                   doc.name === currentDocFile.name && 
                   doc.type === currentDocFile.type && 
                   doc.size === currentDocFile.size;
        })) {
            return true;
        }

        // Compare visibleTo array
        if (updateData.visibleTo && updateData.visibleTo.length !== currentDoc.visibleTo.length) {
            return true;
        }
        if (updateData.visibleTo && !updateData.visibleTo.every((user: any, index: number) => {
            const currentUser = currentDoc.visibleTo[index];
            const currentValue = currentUser.value.toString();
            const newValue = user.value.toString();
            return user.label === currentUser.label && 
                   newValue === currentValue && 
                   user.role === currentUser.role;
        })) {
            return true;
        }

        return false; // No changes detected
    },

    // Get document with version information
    getDocumentWithVersionInfo: async (id: string) => {
        const document = await DocumentModel.findById(id)
            .populate({
                path: "visibleTo.value",
                select: "firstName lastName email"
            })
            .populate({
                path: "userId",
                select: "firstName lastName email"
            });

        if (!document) {
            return null;
        }

        const versions = await documentVersionService.getDocumentVersions(id);
        
        return {
            ...document.toObject(),
            versionHistory: versions,
            hasMultipleVersions: versions.length > 1
        };
    }
};
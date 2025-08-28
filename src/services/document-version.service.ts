import { IDocumentVersion } from "@/contracts/document-version.contract";
import { DocumentVersionModel } from "@/models/document-version.model";
import { DocumentModel } from "@/models/document.model";
import { Types } from "mongoose";

export const documentVersionService = {
    // Create initial version when document is first created
    createInitialVersion: async (documentData: any, documentId: string) => {
        const versionData = {
            documentId: new Types.ObjectId(documentId),
            version: documentData.version || "1.0.0",
            docCategory: documentData.docCategory,
            docTitle: documentData.docTitle,
            docTags: documentData.docTags,
            expiryDate: documentData.expiryDate,
            document: documentData.document,
            author: documentData.author,
            visibleTo: documentData.visibleTo.map((user: any) => ({
                label: user.label,
                value: typeof user.value === 'string' ? new Types.ObjectId(user.value) : user.value,
                role: user.role
            })),
            userId: typeof documentData.userId === 'string' ? new Types.ObjectId(documentData.userId) : documentData.userId,
            isCurrentVersion: true,
            versionNotes: "Initial version"
        };

        const versionDoc = await DocumentVersionModel.create(versionData);
        
        // Update document with reference to current version
        await DocumentModel.findByIdAndUpdate(
            documentId,
            { 
                currentVersionId: versionDoc._id,
                totalVersions: 1
            }
        );

        return versionDoc;
    },

    // Create new version when document is updated
    createNewVersion: async (documentId: string, documentData: any, versionNotes?: string) => {
        // First, mark current version as not current
        await DocumentVersionModel.updateMany(
            { documentId: new Types.ObjectId(documentId) },
            { isCurrentVersion: false }
        );

        // Create new version
        const versionData = {
            documentId: new Types.ObjectId(documentId),
            version: documentData.version,
            docCategory: documentData.docCategory,
            docTitle: documentData.docTitle,
            docTags: documentData.docTags,
            expiryDate: documentData.expiryDate,
            document: documentData.document,
            author: documentData.author,
            visibleTo: documentData.visibleTo.map((user: any) => ({
                label: user.label,
                value: typeof user.value === 'string' ? new Types.ObjectId(user.value) : user.value,
                role: user.role
            })),
            userId: typeof documentData.userId === 'string' ? new Types.ObjectId(documentData.userId) : documentData.userId,
            isCurrentVersion: true,
            versionNotes: versionNotes || `Version ${documentData.version}`
        };

        const versionDoc = await DocumentVersionModel.create(versionData);
        
        // Update document's total versions and current version reference
        const document = await DocumentModel.findById(documentId);
        await DocumentModel.findByIdAndUpdate(
            documentId,
            { 
                currentVersionId: versionDoc._id,
                totalVersions: (document?.totalVersions || 0) + 1
            }
        );

        return versionDoc;
    },

    // Get all versions for a document
    getDocumentVersions: async (documentId: string) => {
        return await DocumentVersionModel.find({ 
            documentId: new Types.ObjectId(documentId) 
        })
        .populate({
            path: "visibleTo.value",
            select: "firstName lastName email"
        })
        .populate({
            path: "userId",
            select: "firstName lastName email"
        })
        .sort({ createdAt: -1 }); // Latest first
    },

    // Get specific version by ID
    getVersionById: async (versionId: string) => {
        return await DocumentVersionModel.findById(versionId)
        .populate({
            path: "visibleTo.value",
            select: "firstName lastName email"
        })
        .populate({
            path: "userId",
            select: "firstName lastName email"
        });
    },

    // Get current version for a document
    getCurrentVersion: async (documentId: string) => {
        return await DocumentVersionModel.findOne({ 
            documentId: new Types.ObjectId(documentId),
            isCurrentVersion: true 
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

    // Check if version number already exists for a document
    versionExists: async (documentId: string, version: string, excludeVersionId?: string) => {
        const query: any = { 
            documentId: new Types.ObjectId(documentId),
            version: version 
        };
        
        if (excludeVersionId) {
            query._id = { $ne: new Types.ObjectId(excludeVersionId) };
        }
        
        const existingVersion = await DocumentVersionModel.findOne(query);
        return existingVersion !== null;
    },

    // Validate if new version is greater than current version
    validateVersionNumber: (currentVersion: string, newVersion: string): boolean => {
        const parseVersion = (version: string) => {
            return version.split('.').map(num => parseInt(num, 10) || 0);
        };

        const current = parseVersion(currentVersion);
        const newVer = parseVersion(newVersion);

        // Compare version parts
        for (let i = 0; i < Math.max(current.length, newVer.length); i++) {
            const currentPart = current[i] || 0;
            const newPart = newVer[i] || 0;
            
            if (newPart > currentPart) {
                return true;
            } else if (newPart < currentPart) {
                return false;
            }
        }
        
        return false; // Versions are equal
    },

    // Get version history with comparison data
    getVersionHistory: async (documentId: string) => {
        const versions = await DocumentVersionModel.find({ 
            documentId: new Types.ObjectId(documentId) 
        })
        .populate({
            path: "userId",
            select: "firstName lastName email"
        })
        .sort({ createdAt: -1 });

        return versions.map((version, index) => ({
            ...version.toObject(),
            isLatest: index === 0,
            versionNumber: versions.length - index
        }));
    },

    // Delete all versions for a document (when document is deleted)
    deleteDocumentVersions: async (documentId: string) => {
        return await DocumentVersionModel.deleteMany({ 
            documentId: new Types.ObjectId(documentId) 
        });
    },

    // Restore a specific version as current
    restoreVersion: async (versionId: string) => {
        const version = await DocumentVersionModel.findById(versionId);
        if (!version) {
            throw new Error("Version not found");
        }

        // Mark all versions as not current
        await DocumentVersionModel.updateMany(
            { documentId: version.documentId },
            { isCurrentVersion: false }
        );

        // Create new version based on the restored version
        const newVersionData = {
            ...version.toObject(),
            _id: undefined,
            isCurrentVersion: true,
            versionNotes: `Restored from version ${version.version}`,
            createdAt: undefined,
            updatedAt: undefined
        };

        const restoredVersion = await DocumentVersionModel.create(newVersionData);

        // Update the main document with the restored data
        await DocumentModel.findByIdAndUpdate(
            version.documentId,
            {
                docCategory: version.docCategory,
                docTitle: version.docTitle,
                docTags: version.docTags,
                version: version.version,
                expiryDate: version.expiryDate,
                document: version.document,
                author: version.author,
                visibleTo: version.visibleTo,
                currentVersionId: restoredVersion._id,
                totalVersions: await DocumentVersionModel.countDocuments({ 
                    documentId: version.documentId 
                })
            }
        );

        return restoredVersion;
    }
};

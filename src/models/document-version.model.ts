import { IDocumentVersion, IDocumentVersionModel } from "@/contracts/document-version.contract";
import { Schema, Types, model } from "mongoose";

const DocumentVersionSchema = new Schema<IDocumentVersion, IDocumentVersionModel>({
    documentId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Document', 
        required: true 
    },
    version: { type: String, required: true },
    docCategory: { type: String, required: true },
    docTitle: { type: String, required: true },
    docTags: { type: [String], default: [] },
    expiryDate: { type: Date, default: null },
    document: [{
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
    }],
    author: { type: String, required: true },
    visibleTo: [{
        label: { type: String, required: true },
        value: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
        role: { type: String, required: true }
    }],
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isCurrentVersion: { 
        type: Boolean, 
        default: false 
    },
    versionNotes: { 
        type: String, 
        default: "" 
    }
}, { timestamps: true });

// Create compound index for documentId and version to ensure unique version per document
DocumentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

// Create index for efficient querying of current versions
DocumentVersionSchema.index({ documentId: 1, isCurrentVersion: 1 });

export const DocumentVersionModel = model<IDocumentVersion, IDocumentVersionModel>('DocumentVersion', DocumentVersionSchema);


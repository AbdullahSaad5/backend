import { IDocument, IDocumentModel } from "@/contracts/document.contract";
import { Schema, Types, model } from "mongoose";

const DocumentSchema = new Schema<IDocument, IDocumentModel>({
    docCategory: { type: String, required: true },
    docTitle: { type: String, required: true },
    docTags: { type: [String], default: [] },
    version: { type: String, default: "1.0.0" },
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
    // Track the total number of versions for this document
    totalVersions: { 
        type: Number, 
        default: 1 
    },
    // Reference to the current version in version history
    currentVersionId: { 
        type: Schema.Types.ObjectId, 
        ref: 'DocumentVersion',
        default: null 
    }
}, { timestamps: true });

export const DocumentModel = model<IDocument, IDocumentModel>('Document', DocumentSchema);
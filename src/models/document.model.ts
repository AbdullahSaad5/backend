import { IDocument, IDocumentModel } from "@/contracts/document.contract";
import { Schema, Types, model } from "mongoose";

const DocumentSchema = new Schema<IDocument, IDocumentModel>({
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
    }
}, { timestamps: true });

export const DocumentModel = model<IDocument, IDocumentModel>('Document', DocumentSchema);
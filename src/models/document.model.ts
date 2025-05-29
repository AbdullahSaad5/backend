import { IDocument, IDocumentModel } from "@/contracts/document.contract";
import { Schema, model } from "mongoose";

const DocumentSchema = new Schema<IDocument, IDocumentModel>({
    docCategory: { type: String, required: true },
    docTitle: { type: String, required: true },
    docTags: { type: [String], default: [] },
    expiryDate: { type: Date, required: true },  
    document: [{
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
    }],
}, { timestamps: true });

export const DocumentModel = model<IDocument, IDocumentModel>('Document', DocumentSchema);
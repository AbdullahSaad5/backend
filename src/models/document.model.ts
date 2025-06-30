import { IDocument, IDocumentModel } from "@/contracts/document.contract";
import { Schema, Types, model } from "mongoose";
import { object } from "zod";

const DocumentSchema = new Schema<IDocument, IDocumentModel>({
    docCategory: { type: String, required: true },
    docTitle: { type: String, required: true },
    docTags: { type: [String], default: [] },
    expiryDate: { type: Date,  },  
    document: [{
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
    }],
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',  // Reference to User model (if applicable)
        required: true 
    },
}, { timestamps: true });

export const DocumentModel = model<IDocument, IDocumentModel>('Document', DocumentSchema);
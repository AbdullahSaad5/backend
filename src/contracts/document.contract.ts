import { Document, Model } from "mongoose";

export interface IDocumentFile {
    url: string;
    name: string;
    type: string;
    size: number;
}

export interface IDocument extends Document {
    docCategory: string;
    docTitle: string;
    docTags: string[];
    expiryDate: Date; 
    document: IDocumentFile[];
    createdAt: Date;
    updatedAt: Date;
}

export type IDocumentModel = Model<IDocument>;
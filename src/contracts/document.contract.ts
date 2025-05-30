import { Document, Model, Types } from "mongoose";

export interface IDocumentFile {
    url: string;
    name: string;
    type: string;
    size: number;
}

export interface IUserRef {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
}

export interface IDocument extends Document {
    docCategory: string;
    docTitle: string;
    docTags: string[];
    expiryDate: Date; 
    document: IDocumentFile[];
    userId: Types.ObjectId | IUserRef; // Can be ObjectId (unpopulated) or user data (populated)
    createdAt: Date;
    updatedAt: Date;
}

export type IDocumentModel = Model<IDocument>;
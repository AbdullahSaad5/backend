import { Document, Model, Types } from "mongoose";

export interface IDocumentFile {
    url: string;
    name: string;
    type: string;
    size: number;
}

export interface IVisibleToUser {
    label: string;
    value: Types.ObjectId;
    role: string;
}

export interface IDocument extends Document {
    docCategory: string;
    docTitle: string;
    docTags: string[];
    version: string;
    expiryDate?: Date | null;
    document: IDocumentFile[];
    author: string;
    visibleTo: IVisibleToUser[];
    userId: Types.ObjectId;
    totalVersions: number;
    currentVersionId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export type IDocumentModel = Model<IDocument>;
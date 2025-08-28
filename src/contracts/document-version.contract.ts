import { Document, Model, Types } from "mongoose";
import { IDocumentFile, IVisibleToUser } from "./document.contract";

export interface IDocumentVersion extends Document {
    documentId: Types.ObjectId;
    version: string;
    docCategory: string;
    docTitle: string;
    docTags: string[];
    expiryDate?: Date | null;
    document: IDocumentFile[];
    author: string;
    visibleTo: IVisibleToUser[];
    userId: Types.ObjectId;
    isCurrentVersion: boolean;
    versionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type IDocumentVersionModel = Model<IDocumentVersion>;



import { Model, Document } from "mongoose";

export interface INewsletter extends Document {
    email: string;
    isBlocked: boolean;
}

export type INewsletterModel = Model<INewsletter>;
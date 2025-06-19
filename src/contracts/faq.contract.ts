import { Model, Document } from "mongoose";

export interface IFaq extends Document {
    category: string;
    question: string;
    answer: string;
    isBlocked: boolean;
}

export type IFaqModel = Model<IFaq>;
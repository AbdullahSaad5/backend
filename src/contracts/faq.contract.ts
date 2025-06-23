

import { Document, Types ,Model} from "mongoose";

export interface IFaq extends Document {
    category: Types.ObjectId; // Changed from string to ObjectId reference
    question: string;
    answer: string;
    isBlocked: boolean;
}

export type IFaqModel = Model<IFaq>;
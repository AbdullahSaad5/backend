import { Document, Model, Types } from "mongoose";


export interface IFaqsPolicy extends Document{
    faqsQuestion: string;
    faqsAnswer: string;
    faqsCategory: string;
}

export type FaqsPolicyModel = Model<IFaqsPolicy>;
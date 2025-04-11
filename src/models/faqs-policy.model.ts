import mongoose, { Schema, model , Document } from "mongoose";
import { IFaqsPolicy, FaqsPolicyModel } from "@/contracts/faqs-policy.contract";

const faqsPolicySchema = new Schema <IFaqsPolicy> ({
    faqsQuestion: { type: String, required: true} ,
    faqsAnswer: { type: String, required: true},
    faqsCategory: {type: String, required: true},
}, {timestamps: true}
)

export const FaqsPolicy = model<IFaqsPolicy, FaqsPolicyModel>('FaqsPolicy', faqsPolicySchema)
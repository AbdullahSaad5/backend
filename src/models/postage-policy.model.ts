import mongoose, { Schema, model , Document } from "mongoose";
import { IPostagePolicy , PostagePolicyModel } from "@/contracts/postage-policy.contract";

const postagePolicySchema = new Schema<IPostagePolicy> ({
    policyName: { type: String, required: true },
    policyDescription: { type: String, required: true },
    postageMethod: { type: String },
    costType: { type: String },
    
}, {timestamps: true})

export const PostagePolicy = model<IPostagePolicy , PostagePolicyModel>('PostagePolicy' , postagePolicySchema)
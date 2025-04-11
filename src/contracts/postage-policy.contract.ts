import { Document, Model, Types } from "mongoose";

export interface IPostagePolicy extends Document {
    policyName: string;
    policyDescription: string;
    postageMethod: string;
    costType: string;
    
}

export type PostagePolicyModel = Model<IPostagePolicy>;
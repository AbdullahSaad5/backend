import { Document, Model } from "mongoose";

export interface IWorkshift extends Document{
    shiftName: string;
    shiftDescription: string;
    startTime: string; 
    endTime: string;   
    mode: 'On Site' | 'Hybrid' | 'Remote';
    employees: string[]; 
    isBlocked?: boolean;  
    createdBy?: string;  
    createdAt?: Date;   
    updatedAt?: Date; 
    userType?:string;
}

export type WorkShift = Model<IWorkshift>
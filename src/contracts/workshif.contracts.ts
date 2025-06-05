import { Document, Model } from "mongoose";

export interface IWorkshift extends Document{
    shiftName: string;
    shiftDescription: string;
    startTime: string; 
    endTime: string;   
    mode: 'On Site' | 'Hybrid' | 'Remote';
    employees: string[]; 
    isActive?: boolean;  
    createdBy?: string;  
    createdAt?: Date;   
    updatedAt?: Date; 
}

export type WorkShift = Model<IWorkshift>
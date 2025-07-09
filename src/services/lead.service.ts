import { LeadModel } from "@/models/lead.model";
import { ILead } from "@/contracts/lead.contract";
import { Types } from "mongoose";

export const LeadService = {
    createLead: (leadData: Omit<ILead, keyof Document>) => {
        const newLead = new LeadModel(leadData);
        return newLead.save();
    },

    editLead: (
        id: string,
        data: {
            name?: string;
            email?: string;
            phoneNumber?: string;
            source?: string;
            assignedTo?: Types.ObjectId;
            leadCategory?: Types.ObjectId;
        }
    ) => {
        return LeadModel.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });
    },

    deleteLead: (id: string) => {
        const lead = LeadModel.findByIdAndDelete(id);
        if (!lead) {
            throw new Error("Lead not found");
        }
        return lead;
    },

    getAllLeads: async () => {
        return LeadModel.find()
            .populate({
                path: 'leadCategory',
                select: 'title description image'
            })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email'
            });
    },

    getLeadById: (id: string) => {
        return LeadModel.findById(id)
            .populate({
                path: 'leadCategory',
                select: 'title description image'
            })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email'
            });
    },

    updateLeadStatus: (id: string, status: "new" | "Contacted" | "Converted" | "Lost") => {
        const updatedLead = LeadModel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        if (!updatedLead) {
            throw new Error("Lead not found");
        }
        return updatedLead;
    },

    getLeadsByStatus: (status: string) => {
        return LeadModel.find({ status })
            .populate({
                path: 'leadCategory',
                select: 'title description image'
            })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email'
            });
    },

    getLeadsByCategory: (categoryId: string) => {
        return LeadModel.find({ leadCategory: categoryId })
            .populate({
                path: 'leadCategory',
                select: 'title description image'
            })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email'
            });
    },

    getLeadsByAssignedUser: (userId: string) => {
        return LeadModel.find({ assignedTo: userId })
            .populate({
                path: 'leadCategory',
                select: 'title description image'
            })
            .populate({
                path: 'assignedTo',
                select: 'firstName lastName email'
            });
    },
}; 
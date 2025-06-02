import { ComplaintModel } from "../models/complaint.model";
import { IComplaint } from "@/contracts/complaint.contract";
import { Types } from "mongoose";

export const complaintService = {
  async createComplaint(complaintData: Omit<IComplaint, keyof Document>): Promise<IComplaint> {
    const complaint = new ComplaintModel(complaintData);
    return complaint.save();
  },

  async getComplaintById(id: string): Promise<IComplaint | null> {
    return ComplaintModel.findById(id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("resolution.resolvedBy", "name email");
  },

  async getAllComplaints(filters: {
    status?: "Open" | "In Progress" | "Closed";
    priority?: "Low" | "Medium" | "High";
    createdBy?: string;
    assignedTo?: string;
    category?: string;
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<IComplaint[]> {
    const query: any = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.createdBy) query.createdBy = new Types.ObjectId(filters.createdBy);
    if (filters.assignedTo) query.assignedTo = new Types.ObjectId(filters.assignedTo);
    if (filters.category) query.category = filters.category;
    if (filters.fromDate || filters.toDate) {
      query.createDate = {};
      if (filters.fromDate) query.createDate.$gte = filters.fromDate;
      if (filters.toDate) query.createDate.$lte = filters.toDate;
    }

    return ComplaintModel.find(query)
      .sort({ priority: -1, dueDate: 1 })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");
  },

  async updateComplaint(
    id: string,
    updateData: Partial<IComplaint>
  ): Promise<IComplaint | null> {
    return ComplaintModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("resolution.resolvedBy", "name email");
  },

  async deleteComplaint(id: string): Promise<IComplaint | null> {
    return ComplaintModel.findByIdAndDelete(id);
  },

  async addFilesToComplaint(
    id: string,
    files: string[]
  ): Promise<IComplaint | null> {
    return ComplaintModel.findByIdAndUpdate(
      id,
      { $addToSet: { attachedFiles: { $each: files } } },
      { new: true, runValidators: true }
    );
  },

  async resolveComplaint(
    id: string,
    resolutionData: {
      description: string;
      resolvedBy: Types.ObjectId;
    }
  ): Promise<IComplaint | null> {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        status: "Closed",
        resolution: {
          description: resolutionData.description,
          resolvedBy: resolutionData.resolvedBy,
          resolvedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).populate("resolution.resolvedBy", "name email");
  }
};
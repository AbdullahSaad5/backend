import { ComplaintModel } from "../models/complaint.model";
import { IComplaint } from "@/contracts/complaint.contract";
import { Types } from "mongoose";

export const complaintService = {
  createComplaint: (complaintData: Omit<IComplaint, keyof Document>) => {
    const newComplaint = new ComplaintModel(complaintData);
    return newComplaint.save();
  },

  editComplaint: (
    id: string,
    data: {
      category?: string;
      title?: string;
      details?: string;
      attachedFiles?: string;
    }
  ) => {
    return ComplaintModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  },

  deleteComplaint: (id: string) => {
    const complaint = ComplaintModel.findByIdAndDelete(id);
    if (!complaint) {
      throw new Error("Complaint not found");
    }
    return complaint;
  },

  getAllComplaints: () => {
    return ComplaintModel.find();
  },

  getComplaintById: (id: string) => {
    return ComplaintModel.findById(id);
  },

  changeStatus: (id: string, status: string) => {
    const updatedTicket = ComplaintModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },
  changePriority: (id: string, priority: string) => {
    const updatedTicket = ComplaintModel.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    );
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },

  addFilesToComplaint: (id: string, files: string[]) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      { $addToSet: { attachedFiles: { $each: files } } },
      { new: true, runValidators: true }
    ).exec();
  },

  resolveComplaint: (
    id: string,
    resolutionData: {
      image?: string[];
      description: string;
      resolvedBy: Types.ObjectId;
    }
  ) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        $set: { status: "Closed" },
        $push: {
          resolution: {
            description: resolutionData.description,
            resolvedBy: resolutionData.resolvedBy,
            resolvedAt: new Date(),
            ...(resolutionData.image && { image: resolutionData.image })
          }
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    )
    .populate("assignedTo", "name email")
    .populate("resolution.resolvedBy", "name email")
    .populate("userId", "name email");
  },
  noteComplaint: (
    id: string,
    resolutionData: {
      image:string,
      description: string;
      notedBy: Types.ObjectId;
    }
  ) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        status: "Closed",
        resolution: {
          image:resolutionData.image,
          description: resolutionData.description,
          resolvedBy: resolutionData.notedBy,
          
        },
      },
      { new: true, runValidators: true }
    ).populate("resolution.resolvedBy", "name email");
  },




};

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

  // getAllComplaints: () => {
  //   return ComplaintModel.find();
  // },
 // In complaint.service.ts
getAllComplaints: async () => {
  return ComplaintModel.find()
    .populate({
      path: 'category',
      select: 'title description image' // Fields you want from Category
    })
    .populate({
      path: 'assignedTo',
      select: 'firstName lastName email' // Fields from User
    })
    .populate({
      path: 'userId',
      select: 'firstName lastName email' // Fields from User
    })
    .populate({
      path: 'resolution.resolvedBy',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'notes.notedBy',
      select: 'firstName lastName email'
    });
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



  
  addNoteToComplaint: (
    id: string,
    noteData: {
      image?: string[];
      description: string;
      notedBy: Types.ObjectId;
    }
  ) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        $push: {
          notes: {
            ...noteData,
            notedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).populate("notes.notedBy", "name email");
  },

  deleteNoteFromComplaint: (id: string, noteId: string) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        $pull: {
          notes: { _id: noteId },
        },
      },
      { new: true }
    );
  },

  addResolutionToComplaint: (
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
            ...resolutionData,
            resolvedAt: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "name email")
      .populate("resolution.resolvedBy", "name email")
      .populate("userId", "name email");
  },

  deleteResolutionFromComplaint: (id: string, resolutionId: string) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        $pull: {
          resolution: { _id: resolutionId },
        },
        $set: { status: "In Progress" }, // Reset status if resolution is deleted
      },
      { new: true }
    );
  },



};

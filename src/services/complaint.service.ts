import { ComplaintModel } from "../models/complaint.model";
import { IComplaint } from "@/contracts/complaint.contract";
import { Types } from "mongoose";

export const complaintService = {
  createComplaint: (complaintData: Omit<IComplaint, keyof Document>) => {
    // Determine initial status based on assignment
    let initialStatus = complaintData.status || "Open";
    if (complaintData.assignedTo && complaintData.assignedTo.length > 0 && initialStatus === "Open") {
      initialStatus = "Assigned";
    }

    const newComplaint = new ComplaintModel({
      ...complaintData,
      status: initialStatus,
      // Initialize timeline with the actual initial status
      timeline: [{
        status: initialStatus,
        changedAt: complaintData.createDate || new Date(),
        changedBy: new Types.ObjectId("000000000000000000000000") // System user
      }]
    });
    return newComplaint.save();
  },

  editComplaint: (
    id: string,
    data: {
      category?: string;
      title?: string;
      details?: string;
      orderNumber?: string;
      platform?: string;
      orderStatus?: "Fulfilled" | "Not Fulfilled";
      attachedFiles?: string;
    }
  ) => {
    return ComplaintModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).populate('timeline.changedBy', 'firstName lastName');
  },

  deleteComplaint: (id: string) => {
    const complaint = ComplaintModel.findByIdAndDelete(id);
    if (!complaint) {
      throw new Error("Complaint not found");
    }
    return complaint;
  },

  // In complaint.service.ts
getAllComplaints: async () => {
  return ComplaintModel.find()
    .populate({
      path: 'assignedTo',
      select: 'firstName lastName email userType', // Include userType for role information
      populate: {
        path: 'userType',
        select: 'role description'
      }
    })
    .populate({
      path: 'userId',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'resolution.resolvedBy',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'notes.notedBy',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'timeline.changedBy',
      select: 'firstName lastName email'
    });
},
  getComplaintById: (id: string) => {
    return ComplaintModel.findById(id)
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('notes.notedBy', 'firstName lastName')
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email userType',
        populate: {
          path: 'userType',
          select: 'role description'
        }
      })
      .populate('userId', 'firstName lastName');
  },

  changeStatus: async (id: string, status: string, userId?: string) => {
    const updateData: any = { status };
    
    // Add to timeline if userId is provided
    if (userId) {
      updateData.$push = {
        timeline: {
          status,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(userId)
        }
      };
    }

    const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('timeline.changedBy', 'firstName lastName');
    
    if (!updatedComplaint) {
      throw new Error("Complaint not found");
    }
    return updatedComplaint;
  },
  
  changePriority: (id: string, priority: string) => {
    const updatedComplaint = ComplaintModel.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    );
    if (!updatedComplaint) {
      throw new Error("Complaint not found");
    }
    return updatedComplaint;
  },

  addFilesToComplaint: (id: string, files: string[]) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      { $addToSet: { attachedFiles: { $each: files } } },
      { new: true, runValidators: true }
    ).exec();
  },

  // Update assignment and automatically change status to "Assigned" if currently "Open"
  updateAssignment: async (id: string, assignedTo: Types.ObjectId[], userId?: string) => {
    const complaint = await ComplaintModel.findById(id);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const updateData: any = { assignedTo };
    
    // If status is "Open" and we're assigning users, change to "Assigned"
    if (complaint.status === "Open" && assignedTo && assignedTo.length > 0) {
      updateData.status = "Assigned";
      
      // Add to timeline if userId is provided
      if (userId) {
        updateData.$push = {
          timeline: {
            status: "Assigned",
            changedAt: new Date(),
            changedBy: new Types.ObjectId(userId)
          }
        };
      }
    }

    const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
    .populate('timeline.changedBy', 'firstName lastName')
    .populate({
      path: 'assignedTo',
      select: 'firstName lastName email userType',
      populate: {
        path: 'userType',
        select: 'role description'
      }
    });

    if (!updatedComplaint) {
      throw new Error("Failed to update complaint");
    }
    return updatedComplaint;
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
        $set: { status: "Resolved" },
        $push: {
          resolution: {
            description: resolutionData.description,
            resolvedBy: resolutionData.resolvedBy,
            resolvedAt: new Date(),
            ...(resolutionData.image && { image: resolutionData.image })
          },
          timeline: {
            status: "Resolved",
            changedAt: new Date(),
            changedBy: resolutionData.resolvedBy
          }
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    )
    .populate({
      path: "assignedTo",
      select: "firstName lastName email userType",
      populate: {
        path: "userType",
        select: "role description"
      }
    })
    .populate("resolution.resolvedBy", "firstName lastName email")
    .populate("userId", "firstName lastName email")
    .populate("timeline.changedBy", "firstName lastName");
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
        $push: {
          timeline: {
            status: "Closed",
            changedAt: new Date(),
            changedBy: resolutionData.notedBy
          }
        }
      },
      { new: true, runValidators: true }
    ).populate("resolution.resolvedBy", "name email")
     .populate("timeline.changedBy", "firstName lastName");
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
        $set: { status: "Resolved" },
        $push: {
          resolution: {
            ...resolutionData,
            resolvedAt: new Date(),
          },
          timeline: {
            status: "Resolved",
            changedAt: new Date(),
            changedBy: resolutionData.resolvedBy
          }
        },
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "assignedTo",
        select: "firstName lastName email userType",
        populate: {
          path: "userType",
          select: "role description"
        }
      })
      .populate("resolution.resolvedBy", "firstName lastName email")
      .populate("userId", "firstName lastName email")
      .populate("timeline.changedBy", "firstName lastName");
  },

  deleteResolutionFromComplaint: (id: string, resolutionId: string) => {
    return ComplaintModel.findByIdAndUpdate(
      id,
      {
        $pull: {
          resolution: { _id: resolutionId },
        },
        $set: { status: "In Progress" }, // Reset status if resolution is deleted
        $push: {
          timeline: {
            status: "In Progress",
            changedAt: new Date(),
            changedBy: new Types.ObjectId("000000000000000000000000") // System user
          }
        }
      },
      { new: true }
    );
  },
};

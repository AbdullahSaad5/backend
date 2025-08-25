import { LeadModel } from "@/models/lead.model";
import { ILead } from "@/contracts/lead.contract";
import { Types } from "mongoose";

export const LeadService = {
  createLead: (leadData: {
    name: string;
    email: string;
    phoneNumber?: string;
    source?: string;
    purpose?: string;
    description?: string;
    assignedTo?: Types.ObjectId;
    leadCategory: Types.ObjectId;
    notes?: any[];
  }) => {
    const newLead = new LeadModel(leadData);
    return newLead.save();
  },

  editLead: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      source?: string;
      purpose?: string;
      description?: string;
      assignedTo?: Types.ObjectId[] | Types.ObjectId;
      leadCategory?: Types.ObjectId;
    },
    userId?: string
  ) => {
    const updateOps: any = { $set: data };

    // If assignedTo is being updated, do not push assigned users into timeline per requirements
    // We only keep timeline entries for status changes.

    return LeadModel.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
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
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },
  searchAndFilterLead: async (
    limitNum: number,
    skip: number,
    filter: Record<string, any>
  ) => {
    try {
      const [leads, total] = await Promise.all([
        LeadModel.find(filter)
          .populate({
            path: "leadCategory",
            select: "name description image",
          })
          .populate({
            path: "assignedTo",
            select: "firstName lastName email",
          })
          .populate("timeline.changedBy", "firstName lastName")
          .populate("notes.notedBy", "firstName lastName")
          .skip(skip)
          .limit(limitNum)
          .sort({ createdAt: -1 }),
        LeadModel.countDocuments(filter),
      ]);

      return { leads, total };
    } catch (error) {
      console.error("Error during search and filter:", error);
      throw new Error("Error during search and filter");
    }
  },

  getLeadById: (id: string) => {
    return LeadModel.findById(id)
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },

  updateLeadStatus: async (
    id: string,
    status:
      | "new"
      | "Contacted"
      | "Converted"
      | "Lost"
      | "Cold-Lead"
      | "Hot-Lead"
      | "Bad-Contact",
    userId?: string
  ) => {
    const updateData: any = { status };
    if (userId && Types.ObjectId.isValid(userId)) {
      updateData.$push = {
        timeline: {
          status,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(userId),
        },
      };
    }

    const updatedLead = await LeadModel.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");

    if (!updatedLead) {
      throw new Error("Lead not found");
    }
    return updatedLead;
  },

  // Notes methods
  addNote: async (
    leadId: string,
    description: string,
    userId: string,
    images?: string[]
  ): Promise<ILead> => {
    if (!Types.ObjectId.isValid(leadId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const noteData: any = {
      description,
      notedBy: new Types.ObjectId(userId),
      notedAt: new Date(),
    };

    if (images && images.length > 0) {
      noteData.image = images;
    }

    const updatedLead = await LeadModel.findByIdAndUpdate(
      leadId,
      { $push: { notes: noteData } },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "firstName lastName")
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");

    if (!updatedLead) throw new Error("Failed to add note");
    return updatedLead;
  },

  deleteNote: async (leadId: string, noteId: string): Promise<ILead> => {
    if (!Types.ObjectId.isValid(leadId) || !Types.ObjectId.isValid(noteId)) {
      throw new Error("Invalid ID");
    }

    const updatedLead = await LeadModel.findByIdAndUpdate(
      leadId,
      { $pull: { notes: { _id: new Types.ObjectId(noteId) } } },
      { new: true }
    )
      .populate("assignedTo", "firstName lastName")
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");

    if (!updatedLead) throw new Error("Failed to delete note");
    return updatedLead;
  },

  getLeadsByStatus: (status: string) => {
    return LeadModel.find({ status })
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },

  getLeadsByCategory: (categoryId: string) => {
    return LeadModel.find({ leadCategory: categoryId })
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },

  getLeadsByAssignedUser: (userId: string) => {
    return LeadModel.find({ assignedTo: userId })
      .populate({
        path: "leadCategory",
        select: "name description image",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName email",
      })
      .populate("timeline.changedBy", "firstName lastName")
      .populate("timeline.assignedUsers", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },
};

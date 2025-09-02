import { LeadModel } from "@/models/lead.model";
import { ILead } from "@/contracts/lead.contract";
import { Types } from "mongoose";

export const LeadService = {
  createLead: (leadData: {
    name: string;
    email: string;
    phoneNumber?: string;
    productId?: Types.ObjectId;
    source?: string;
    purpose?: string;
    description?: string;
    assignedTo?: Types.ObjectId[]
    status?: "New" | "Contacted" | "Converted" | "Lost" | "Hot-Lead" | "Cold-Lead" | "Bad-Contact";
    leadCategory: Types.ObjectId;
    notes?: any[];
    shippingAddress?: {
      street1: string;
      street2?: string;
      city: string;
      stateProvince: string;
      postalCode: string;
      country: string;
    };
  }) => {
    const initialStatus = leadData.status || "New";
    
    const newLead = new LeadModel({
      ...leadData,
      status: initialStatus,
      // Initialize timeline with the initial status
      timeline: [{
        status: initialStatus,
        changedAt: new Date(),
        changedBy: new Types.ObjectId("000000000000000000000000"), // System user for initial creation
      }]
    });
    return newLead.save();
  },

  editLead: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      productId?: Types.ObjectId;
      source?: string;
      purpose?: string;
      description?: string;
      assignedTo?: Types.ObjectId[];
      leadCategory?: Types.ObjectId;
      shippingAddress?: {
        street1: string;
        street2?: string;
        city: string;
        stateProvince: string;
        postalCode: string;
        country: string;
      };
      status?: "New" | "Contacted" |  "Converted" | "Lost" | "Hot-Lead" | "Cold-Lead" | "Bad-Contact";
    },
    userId?: string
  ) => {
    const updateOps: any = { $set: data };
    const timelineEntries: any[] = [];

    // If status is being updated, add timeline entry
    if (data.status && userId && Types.ObjectId.isValid(userId)) {
      timelineEntries.push({
        status: data.status,
        changedAt: new Date(),
        changedBy: new Types.ObjectId(userId),
      });
    }

    // If assignedTo is being updated, add timeline entry for assignment change
    if (data.assignedTo && userId && Types.ObjectId.isValid(userId)) {
      timelineEntries.push({
        status: "Assignment Changed",
        changedAt: new Date(),
        changedBy: new Types.ObjectId(userId),
        assignedUsers: data.assignedTo,
      });
    }

    // Add timeline entries if any
    if (timelineEntries.length > 0) {
      updateOps.$push = {
        timeline: { $each: timelineEntries }
      };
    }

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
      .populate("timeline.assignedUsers", "firstName lastName")
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
      .populate("timeline.assignedUsers", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },
  searchAndFilterLead: async (limitNum: number, skip: number, filter: Record<string, any>) => {
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
          .populate("timeline.assignedUsers", "firstName lastName")
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
      .populate("timeline.assignedUsers", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");
  },

  updateLeadStatus: async (
    id: string,
    status: "New" | "Contacted" | "Converted" | "Lost" | "Cold-Lead" | "Hot-Lead" | "Bad-Contact",
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
      .populate("timeline.assignedUsers", "firstName lastName")
      .populate("notes.notedBy", "firstName lastName");

    if (!updatedLead) {
      throw new Error("Lead not found");
    }
    return updatedLead;
  },

  // Notes methods
  addNote: async (leadId: string, description: string, userId: string, images?: string[]): Promise<ILead> => {
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

    // Create timeline entry for the note
    const timelineEntry: any = {
      changedAt: new Date(),
      changedBy: new Types.ObjectId(userId),
      noteDescription: description,
    };

    if (images && images.length > 0) {
      timelineEntry.noteImages = images;
    }

    const updatedLead = await LeadModel.findByIdAndUpdate(
      leadId,
      { 
        $push: { 
          notes: noteData,
          timeline: timelineEntry
        } 
      },
      { new: true, runValidators: true }
    )
      .populate("assignedTo", "firstName lastName")
      .populate("timeline.changedBy", "firstName lastName")
      .populate("timeline.assignedUsers", "firstName lastName")
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
      .populate("timeline.assignedUsers", "firstName lastName")
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
      .populate("timeline.assignedUsers", "firstName lastName")
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
      .populate("timeline.assignedUsers", "firstName lastName")
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

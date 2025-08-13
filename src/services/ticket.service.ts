import { TicketModel } from "@/models/ticket.model";
import { IResolution, ITicket } from "@/contracts/ticket.contract";
import { Types } from "mongoose";

export const ticketService = {
  createTicket: (
    title: string,
    client: string,
    assignedTo: Types.ObjectId[] | undefined,
    createDate: Date,
    dueDate: Date,
    status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved",
    priority: "Low" | "Medium" | "High" | "Urgent",
    role: Types.ObjectId,
    description: string,
    isEscalated?: boolean,
    chatMessageId?: string,
    images?: string[],
    platform?: string,
    orderReference?: string,
    orderStatus?: "Fulfilled" | "Not Fulfilled"
  ) => {
    // Determine initial status based on assignment
    let initialStatus = status;
    if (assignedTo && assignedTo.length > 0 && status === "Open") {
      initialStatus = "Assigned";
    }

    const newTicket = new TicketModel({
      title,
      client,
      assignedTo: assignedTo || [],
      createDate,
      dueDate,
      status: initialStatus,
      priority,
      role,
      description,
      isEscalated: isEscalated || false,
      chatMessageId: chatMessageId || null,
      images: images || [],
      platform,
      orderReference,
      orderStatus,
      // Initialize timeline with the actual initial status
      timeline: [{
        status: initialStatus,
        changedAt: createDate,
        changedBy: new Types.ObjectId("000000000000000000000000") // System user
      }]
    });
    return newTicket.save();
  },

  editTicket: (
    id: string,
    data: {
      title?: string;
      client?: string;
      assignedTo?: Types.ObjectId[];
      createDate?: Date;
      dueDate?: Date;
      status?: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved";
      priority?: "Low" | "Medium" | "High" | "Urgent";
      role?: Types.ObjectId;
      description?: string;
      images?: string[];
      platform?: string;
      orderReference?: string;
      orderStatus?: "Fulfilled" | "Not Fulfilled";
    }
  ) => {
    return TicketModel.findByIdAndUpdate(id, data, { new: true })
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');
  },

  deleteTicket: async (id: string) => {
    // Get the ticket to check if it exists
    const ticket = await TicketModel.findById(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Delete the ticket
    const deletedTicket = await TicketModel.findByIdAndDelete(id);
    return deletedTicket;
  },

  getAllTicket: () => {
    return TicketModel.find()
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('resolutions.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName');
  },

  getById: (id: string) => {
    return TicketModel.findById(id)
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('resolutions.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName');
  },

  changeStatus: async (id: string, status: "Open" | "Assigned" | "In Progress" | "Closed" | "Resolved", userId?: string) => {
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

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');
    
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },

  changePriority: (id: string, priority: "Low" | "Medium" | "High" | "Urgent") => {
    const updatedTicket = TicketModel.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName');
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },

  changeRole: (id: string, role: Types.ObjectId) => {
    const updatedTicket = TicketModel.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName');
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },

  // Update assignment and automatically change status to "Assigned" if currently "Open" or "Resolved"
  updateAssignment: async (id: string, assignedTo: Types.ObjectId[], userId?: string) => {
    const ticket = await TicketModel.findById(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const updateData: any = { assignedTo };
    
    // Determine the appropriate status and timeline entry
    let timelineStatus = "Assignment Changed";
    let shouldUpdateStatus = false;
    
    // If status is "Open" and we're assigning users, change to "Assigned"
    if (ticket.status === "Open" && assignedTo && assignedTo.length > 0) {
      updateData.status = "Assigned";
      timelineStatus = "Assigned";
      shouldUpdateStatus = true;
    }
    // If status is "Resolved" and we're reassigning users, change to "Assigned"
    else if (ticket.status === "Resolved" && assignedTo && assignedTo.length > 0) {
      updateData.status = "Assigned";
      timelineStatus = "Assigned";
      shouldUpdateStatus = true;
    }
    
    // Add timeline entry if userId is provided
    if (userId) {
      updateData.$push = {
        timeline: {
          status: timelineStatus,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(userId),
          assignedUsers: assignedTo
        }
      };
    }

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');

    if (!updatedTicket) {
      throw new Error("Failed to update ticket");
    }
    return updatedTicket;
  },

  addResolution: async (
    ticketId: string,
    description: string,
    userId: string
  ): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const resolution: IResolution = {
      description,
      resolvedBy: new Types.ObjectId(userId),
      closedAt: new Date()
    };

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      {
        status: 'Resolved',
        resolution, // Keep for backward compatibility
        $push: {
          resolutions: resolution,
          timeline: {
            status: 'Resolved',
            changedAt: new Date(),
            changedBy: new Types.ObjectId(userId),
            resolutionDescription: description
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('resolutions.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to update ticket');
    return updatedTicket;
  },

  // New method to get all resolutions for a ticket
  getResolutions: async (ticketId: string): Promise<IResolution[]> => {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new Error("Invalid ticket ID");
    }

    const ticket = await TicketModel.findById(ticketId)
      .populate('resolutions.resolvedBy', 'firstName lastName');
    
    if (!ticket) throw new Error('Ticket not found');
    
    return ticket.resolutions || [];
  },

  // New method to delete a specific resolution
  deleteResolutionById: async (ticketId: string, resolutionId: string): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(resolutionId)) {
      throw new Error("Invalid ID");
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      {
        $pull: { resolutions: { _id: resolutionId } }
      },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolutions.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to remove resolution');
    return updatedTicket;
  },

  deleteResolution: async (ticketId: string): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new Error("Invalid ticket ID");
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (!ticket.resolution) throw new Error('No resolution exists for this ticket');

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      {
        $unset: { resolution: 1 },
        status: 'In Progress',
        $push: {
          timeline: {
            status: 'In Progress',
            changedAt: new Date(),
            changedBy: new Types.ObjectId("000000000000000000000000") // System user
          }
        }
      },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to remove resolution');
    return updatedTicket;
  },

  updateResolution: async (
    ticketId: string,
    description: string,
    userId: string
  ): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (!ticket.resolution) throw new Error('No resolution exists for this ticket');

    const updatedResolution = {
      description,
      resolvedBy: new Types.ObjectId(userId),
      closedAt: ticket.resolution.closedAt || new Date()
    };

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { resolution: updatedResolution },
      { new: true, runValidators: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to update resolution');
    return updatedTicket;
  },

  addImagesToTicket: async (ticketId: string, imageUrls: string[]): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new Error("Invalid ticket ID");
    }

    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    // Add new images to existing ones
    const updatedImages = [...(ticket.images || []), ...imageUrls];

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { images: updatedImages },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to add images to ticket');
    return updatedTicket;
  },

  // Comment methods
  addComment: async (ticketId: string, content: string, userId: string, parentCommentId?: string): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const commentData: any = {
      content,
      author: new Types.ObjectId(userId),
      createdAt: new Date(),
    };

    if (parentCommentId && Types.ObjectId.isValid(parentCommentId)) {
      commentData.parentComment = new Types.ObjectId(parentCommentId);
    }

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { $push: { comments: commentData } },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to add comment');
    return updatedTicket;
  },

  updateComment: async (ticketId: string, commentId: string, content: string, userId: string): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(commentId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const updatedTicket = await TicketModel.findOneAndUpdate(
      { 
        _id: ticketId, 
        'comments._id': commentId,
        'comments.author': userId // Ensure user owns the comment
      },
      { 
        $set: { 
          'comments.$.content': content,
          'comments.$.updatedAt': new Date()
        } 
      },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName')
      .populate('comments.parentComment');

    if (!updatedTicket) throw new Error('Comment not found or unauthorized');
    return updatedTicket;
  },

  deleteComment: async (ticketId: string, commentId: string, userId: string): Promise<ITicket> => {
    if (!Types.ObjectId.isValid(ticketId) || !Types.ObjectId.isValid(commentId) || !Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid ID");
    }

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      { 
        $pull: { 
          comments: { 
            _id: commentId,
            author: userId // Ensure user owns the comment
          } 
        } 
      },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .populate('timeline.changedBy', 'firstName lastName')
      .populate('timeline.assignedUsers', 'firstName lastName')
      .populate('comments.author', 'firstName lastName')
      .populate('comments.parentComment');

    if (!updatedTicket) throw new Error('Comment not found or unauthorized');
    return updatedTicket;
  }
};
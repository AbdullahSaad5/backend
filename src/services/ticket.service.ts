import { TicketModel } from "@/models/ticket.model";
import { IResolution, ITicket } from "@/contracts/ticket.contract";
import { Types } from "mongoose";

export const ticketService = {
  createTicket: (
    title: string,
    client: string,
    assignedTo: Types.ObjectId | undefined,
    createDate: Date,
    dueDate: Date,
    status: "Open" | "In Progress" | "Closed" | "Resolved",
    priority: "Low" | "Medium" | "High" | "Urgent",
    role: Types.ObjectId,
    description: string,
    isEscalated?: boolean,
    chatMessageId?: string
  ) => {
    const newTicket = new TicketModel({
      title,
      client,
      assignedTo,
      createDate,
      dueDate,
      status,
      priority,
      role,
      description,
      isEscalated: isEscalated || false,
      chatMessageId: chatMessageId || null,
    });
    return newTicket.save();
  },

  editTicket: (
    id: string,
    data: {
      title?: string;
      client?: string;
      assignedTo?: Types.ObjectId;
      createDate?: Date;
      dueDate?: Date;
      status?: "Open" | "In Progress" | "Closed" | "Resolved";
      priority?: "Low" | "Medium" | "High" | "Urgent";
      role?: Types.ObjectId;
      description?: string;
    }
  ) => {
    return TicketModel.findByIdAndUpdate(id, data, { new: true })
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName');
  },

  deleteTicket: (id: string) => {
    const ticket = TicketModel.findByIdAndDelete(id);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    return ticket;
  },

  getAllTicket: () => {
    return TicketModel.find()
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');
  },

  getById: (id: string) => {
    return TicketModel.findById(id)
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');
  },

  changeStatus: (id: string, status: "Open" | "In Progress" | "Closed" | "Urgent") => {
    const updatedTicket = TicketModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName');
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
    if (ticket.status === 'Closed') throw new Error('Ticket already closed');

    const resolution: IResolution = {
      description,
      resolvedBy: new Types.ObjectId(userId),
      closedAt: new Date()
    };

    const updatedTicket = await TicketModel.findByIdAndUpdate(
      ticketId,
      {
        status: 'Closed',
        resolution
      },
      { new: true, runValidators: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to update ticket');
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
        status: 'In Progress'
      },
      { new: true }
    )
      .populate('role', 'role')
      .populate('assignedTo', 'firstName lastName');

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
      .populate('resolution.resolvedBy', 'firstName lastName');

    if (!updatedTicket) throw new Error('Failed to update resolution');
    return updatedTicket;
  }
};
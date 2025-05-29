import { TicketModel } from "@/models/ticket.model";
import { ITicket } from "@/contracts/ticket.contract";
import { Types } from "mongoose";

export const ticketService = {
  createTicket: (
    title: String,
    client: String,
    assignedTo: String,
    createDate: String,
    dueDate: String,
    status: String,
    priority: String,
    department: String,
    description: String
  ) => {
    const newticket = new TicketModel({
      title,
      client,
      assignedTo,
      createDate,
      dueDate,
      status,
      priority,
      department,
      description,
    });
    return newticket.save();
  },
  editTicket: (
    id: string,
    data: {
      title: String;
      client: String;
      assignedTo: String;
      createDate: String;
      dueDate: String;
      status: String;
      priority: String;
      department: String;
    }
  ) => {
    return TicketModel.findByIdAndUpdate(id, data, { new: true });
  },
  deleteTicket: (id: string) => {
    const Ticket = TicketModel.findByIdAndDelete(id);
    if (!Ticket) {
      throw new Error("Ticket not found");
    }
    return Ticket;
  },
  getAllTicket: () => {
    return TicketModel.find();
  },
  getById: (id: string) => {
    return TicketModel.findById(id);
  },
  changeStatus: (id: string, status: string) => {
    const updatedTicket = TicketModel.findByIdAndUpdate(
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
    const updatedTicket = TicketModel.findByIdAndUpdate(
      id,
      { priority },
      { new: true }
    );
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },
  changeDepartment: (id: string, department: string) => {
    const updatedTicket = TicketModel.findByIdAndUpdate(
      id,
      { department },
      { new: true }
    );
    if (!updatedTicket) {
      throw new Error("Ticket not found");
    }
    return updatedTicket;
  },


  
  addResolution: async (
    ticketId: string,
    description: string,
    userId: string
  ) => {
    // Validate IDs
    if (!Types.ObjectId.isValid(ticketId)) {
      throw new Error(`Invalid ticket ID: ${ticketId}`);
    }
  
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
  
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');
  
    // Check if already closed
    if (ticket.status === 'Closed') {
      throw new Error('Ticket already closed');
    }
  
    const updateData = {
      status: 'Closed',
      resolution: {
        description,
        resolvedBy: userId, // Just store the ID
        resolvedAt: new Date()
      },
      closedAt: new Date()
    };
  
    try {
      const updatedTicket = await TicketModel.findByIdAndUpdate(
        ticketId,
        updateData,
        { 
          new: true,
          runValidators: true 
        }
      ).lean(); // Use lean() for better performance if you don't need mongoose document
  
      if (!updatedTicket) throw new Error('Update failed');
      
      return updatedTicket;
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to update ticket in database');
    }
  },

  
};

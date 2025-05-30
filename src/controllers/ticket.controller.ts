import { ticketService } from "@/services/ticket.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ITicket } from "@/contracts/ticket.contract";
import { Types } from "mongoose";
import { jwtVerify } from "@/utils/jwt.util";
import { authService } from "@/services";

export const tickerControler = {
  addticket: async (req: Request, res: Response) => {
    try {
      const {
        title,
        client,
        assignedTo,
        createDate,
        dueDate,
        status,
        priority,
        department,
        description,
      } = req.body;
      console.log(
        "ticket data ",
        title,
        client,
        assignedTo,
        createDate,
        dueDate,
        status,
        priority,
        department,
        description
      );
      const newTicket = await ticketService.createTicket(
        title,
        client,
        assignedTo,
        createDate,
        dueDate,
        status,
        priority,
        department,
        description
      );
      res
        .status(StatusCodes.CREATED)
        .json({ success: true, message: "ticket generated successfully" });
    } catch (error: any) {
      if (error.title === "MongoServerError" && error.code === 11000) {
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        // console.error(error);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Error creating user Ticket" });
      }
    }
  },
  editTicket: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        title,
        client,
        assignedTo,
        createDate,
        dueDate,
        status,
        priority,
        department,
      } = req.body;
      const Ticket = await ticketService.editTicket(id, {
        title,
        client,
        assignedTo,
        createDate,
        dueDate,
        status,
        priority,
        department,
      });
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Ticket updated successfully",
        data: Ticket,
      });
    } catch (error: any) {
      // console.error("Edit Ticket Error:", error);
      if (error.title === "MongoServerError" && error.code === 11000) {
        // console.log("insode if  error : ")
        // Handle duplicate key error (unique constraint violation)
        const field = Object.keys(error.keyPattern)[0]; // Find the duplicate field
        // console.log("field : " , field)
        res.status(StatusCodes.BAD_REQUEST).json({
          message: `The ${field} must be unique. "${req.body[field]}" is already in use.`,
        });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Error updating Ticket Ticket" });
      }
    }
  },

  deleteTicket: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await ticketService.deleteTicket(id);
      res.status(StatusCodes.OK).json({
        success: true,
        message: "Ticket deleted successfully",
        deletedUser: result,
      });
    } catch (error) {
      console.error("Delete Ticket Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error deleting Ticket Ticket" });
    }
  },
  getAllTicket: async (req: Request, res: Response) => {
    try {
      const categories = await ticketService.getAllTicket();
      console.log(categories);
      res.status(StatusCodes.OK).json({ success: true, data: categories });
    } catch (error) {
      console.error("View Categories Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Error getting all Ticket categories",
      });
    }
  },

  getSpecificTicket: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await ticketService.getById(id);
      //   console.log(result);
      if (!result) return res.status(404).json({ message: "Ticket not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View Ticket Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting Ticket Ticket" });
    }
  },

  toggleticketstatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Open", "In Progress", "Closed"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Status is required and must be one of: Open, In Progress, Closed",
        allowedStatuses,
      });
    }

    try {
      const result = await ticketService.changeStatus(id, status);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Status changed successfully",
        data: result,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: Error,
      });
    }
  },
  toggleprioritystatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body;

    const allowedpriority = ["Low", "Medium", "High"];

    if (!priority || !allowedpriority.includes(priority)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Status is required and must be one of: Open, In Progress, Closed",
        allowedpriority,
      });
    }

    try {
      const result = await ticketService.changePriority(id, priority);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Status changed successfully",
        data: result,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: Error,
      });
    }
  },
  toggledepartmentstatus: async (req: any, res: Response) => {
    const { id } = req.params;
    const { department } = req.body;

    const alloweddepartment = ["SUPPORT", "SALES", "INVENTORY"];

    if (!department || !alloweddepartment.includes(department)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message:
          "Status is required and must be one of: Open, In Progress, Closed",
        alloweddepartment,
      });
    }

    try {
      const result = await ticketService.changeDepartment(id, department);

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Status changed successfully",
        data: result,
      });
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong",
        error: Error,
      });
    }
  },

  addResolution: async (req: any, res: Response) => {
    try {
      const { ticketId } = req.params;
      const { description } = req.body;

      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (!token || typeof token !== "string") {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: "Invalid verification token. " });
      }
      const decoded = jwtVerify(token);
      const userId = decoded.id.toString();
      const user = await authService.findUserById(userId);
      if (!user) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json({ success: false, message: " User not found." });
      }

      // Validate input
      if (!description?.trim() || description.trim().length < 10) {
        return res.status(400).json({
          message: "Resolution must be at least 10 characters",
        });
      }

      const resolvedTicket = await ticketService.addResolution(
        ticketId,
        description,
        userId.toString() // Ensure it's a string
      );

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Ticket resolved successfully",
        data: resolvedTicket,
      });
    } catch (error: any) {
      // ... existing error handling
    }
  },
};

import { ITicket } from "@/contracts/ticket.contract";
import { model, Schema } from "mongoose";

const TicketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    client: {
      type: String,
      required: true,
      trim: true,
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    createDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Closed"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    department: {
      type: String,
      enum: ["SUPPORT", "SALES", "INVENTORY"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    resolution: {
      description: {
        type: String,
        trim: true,
        required: function (this: ITicket) {
          return this.status === "Closed";
        },
        minlength: [10, "Resolution must be at least 10 characters"],
      },
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: function (this: ITicket) {
          return this.status === "Closed";
        },
      },
      closedAt: {
        type: Date
      }
      
    },
    
  },
  {
    timestamps: true, // optional but recommended
  }
);
// Export the model
export const TicketModel = model<ITicket>("Ticket", TicketSchema);

import { ITicket } from "@/contracts/ticket.contract";
import { model, Schema, Types } from "mongoose";

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
    role: {
      type: Schema.Types.ObjectId,
      ref: "UserCategory",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      enum: ["Open", "In Progress", "Closed", "Resolved"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
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
          return this.status === "Resolved";
        },
        minlength: [10, "Resolution must be at least 10 characters"],
      },
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: function (this: ITicket) {
          return this.status === "Resolved";
        },
      },
      closedAt: {
        type: Date
      }
    },
    isEscalated: {
      type: Boolean,
      default: false,
    },
    isManuallyEscalated: {
      type: Boolean,
      default: false,
    },
    chatMessageId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const TicketModel = model<ITicket>("Ticket", TicketSchema);
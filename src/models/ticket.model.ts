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
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
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
      enum: ["Open", "Assigned", "In Progress", "Closed", "Resolved"],
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
    // Timeline to track status changes
    timeline: [{
      status: {
        type: String,
        enum: ["Open", "Assigned", "In Progress", "Closed", "Resolved", "Assignment Changed"],
        required: true
      },
      changedAt: {
        type: Date,
        default: Date.now
      },
      changedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
      },
      assignedUsers: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        default: undefined
      }
    }],
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
    // New fields
    images: {
      type: [String],
      default: [],
    },
    platform: {
      type: String,
      trim: true,
    },
    orderReference: {
      type: String,
      trim: true,
    },
    orderStatus: {
      type: String,
      enum: ["Fulfilled", "Not Fulfilled"],
    },
  },
  {
    timestamps: true,
  }
);

export const TicketModel = model<ITicket>("Ticket", TicketSchema);
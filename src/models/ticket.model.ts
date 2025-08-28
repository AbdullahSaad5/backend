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
    // Multiple resolutions support
    resolutions: [{
      description: {
        type: String,
        trim: true,
        required: true,
        minlength: [10, "Resolution must be at least 10 characters"],
      },
      resolvedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      closedAt: {
        type: Date,
        default: Date.now
      },
      // Images specific to this resolution
      images: {
        type: [String],
        default: [],
      }
    }],
    // Keep single resolution for backward compatibility
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
      },
      // Optional images for single resolution (backward compatibility)
      images: {
        type: [String],
        default: undefined
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
      },
      resolutionDescription: {
        type: String,
        default: undefined
      },
      resolutionImages: {
        type: [String],
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
    category: {
      type: String,
      trim: true,
      default: "Ticket",
    },
    // Comments field
    comments: [{
      content: {
        type: String,
        required: true,
        trim: true,
      },
      author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
      },
      parentComment: {
        type: Schema.Types.ObjectId,
        default: null,
      },
      images: {
        type: [String],
        validate: {
          validator: (urls: string[]) => urls.length <= 6,
          message: "Cannot attach more than 6 images to a comment",
        },
        default: [],
      },
    }],
    // Notes field (similar to complaint notes)
    notes: [
      {
        image: {
          type: [String],
          validate: {
            validator: (urls: string[]) => urls.length <= 10,
            message: "Cannot attach more than 10 files",
          },
          default: [],
        },
        description: {
          type: String,
          trim: true,
        },
        notedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        notedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const TicketModel = model<ITicket>("Ticket", TicketSchema);
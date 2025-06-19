
import { Schema, model } from "mongoose";
import { INewsletter, INewsletterModel } from "@/contracts/newsletter.contract";

const NewsletterSchema = new Schema<INewsletter, INewsletterModel>({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please fill a valid email address"]
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const NewsletterModel = model<INewsletter>("Newsletter", NewsletterSchema);
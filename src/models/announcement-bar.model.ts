import mongoose, { Schema } from "mongoose";
import { IAnnouncementBar } from "@/contracts/announcement-bar.contract";

const AnnouncementBarSchema: Schema = new Schema(
  {
    announcementText: {
      type: String,
      required: [true, "Announcement text is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const AnnouncementBarModel = mongoose.model<IAnnouncementBar>("AnnouncementBar", AnnouncementBarSchema);

export default AnnouncementBarModel;

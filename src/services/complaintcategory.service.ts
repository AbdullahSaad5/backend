import { IComplaintModel } from "@/models/complaintcategory.model";

export const complaintService = {
  createComplaint: (title: String, description: string, image: string) => {
    const newComplaint = new IComplaintModel({ title, description, image });
    return newComplaint.save();
  },

  editComplaint: (id: string, data: { title?: string; description?: string; image?: string, isBlocked?: boolean }) => {
    return IComplaintModel.findByIdAndUpdate(id, data, { new: true });
  },
  deleteComplaint: (id: string) => {
    const Complaint = IComplaintModel.findByIdAndDelete(id);
    if (!Complaint) {
      throw new Error("Complaint not found");
    }
    return Complaint;
  },

  getAllComplaint: () => {
    return IComplaintModel.find();
  },

  getById: (id: string) => {
    return IComplaintModel.findById(id);
  },

  
};

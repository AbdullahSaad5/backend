import { LeadsCategoryModel } from "@/models/leadscategory.model";

export const LeadsCategoryService = {
    createLeadsCategory: (title: string, description: string, image: string) => {
        const newLeadsCategory = new LeadsCategoryModel({ title, description, image });
        return newLeadsCategory.save();
    },

    editLeadsCategory: (id: string, data: { title?: string; description?: string; image?: string; isBlocked?: boolean }) => {
        return LeadsCategoryModel.findByIdAndUpdate(id, data, { new: true });
    },

    deleteLeadsCategory: (id: string) => {
        const leadsCategory = LeadsCategoryModel.findByIdAndDelete(id);
        if (!leadsCategory) {
            throw new Error("Leads category not found");
        }
        return leadsCategory;
    },

    getAllLeadsCategories: () => {
        return LeadsCategoryModel.find();
    },

    getById: (id: string) => {
        return LeadsCategoryModel.findById(id);
    },
}; 
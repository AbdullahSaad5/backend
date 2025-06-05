// src/services/revenue.service.ts
import { IRevenue } from "@/contracts/revenue.contract";
import { RevenueModel } from "@/models/revenue.model";
import { FilterQuery } from "mongoose";


export const RevenueService = {
  createRevenue: (description: string, amount: number, source: string, date: Date) => {
    const newRevenue = new RevenueModel({ description, amount, source, date });
    return newRevenue.save();
  },

  editRevenue: (id: string, data: { 
    description?: string; 
    amount?: number; 
    source?: string; 
    date?: Date;
    isBlocked?: boolean;
  }) => {
    return RevenueModel.findByIdAndUpdate(id, data, { new: true });
  },

  deleteRevenue: (id: string) => {
    const revenue = RevenueModel.findByIdAndDelete(id);
    if (!revenue) {
      throw new Error("Revenue record not found");
    }
    return revenue;
  },

  getAllRevenues: (filter: FilterQuery<IRevenue> = {}) => {
    return RevenueModel.find(filter).sort({ date: -1 });
  },

  getRevenueById: (id: string) => {
    return RevenueModel.findById(id);
  },

  getRevenuesByDateRange: (startDate: Date, endDate: Date, source?: string) => {
    const filter: FilterQuery<IRevenue> = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (source) {
      filter.source = source;
    }
    
    return RevenueModel.find(filter).sort({ date: -1 });
  },
};
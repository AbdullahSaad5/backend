// src/services/revenue.service.ts
import { IRevenue } from "@/contracts/revenue.contract";
import { RevenueModel } from "@/models/revenue.model";
import { FilterQuery } from "mongoose";


export const RevenueService = {
  createRevenue: (description: string, amount: number, source: string, receiveType: string, date: Date, image: string) => {
    const newRevenue = new RevenueModel({ description, amount, source, receiveType, date, image });
    return newRevenue.save();
  },

  editRevenue: (id: string, data: { 
    description?: string; 
    amount?: number; 
    source?: string; 
    receiveType?: string; 
    date?: Date;
    image?: string;
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
    return RevenueModel.find(filter).sort({ createdAt: -1 });
  },

  getRevenueById: (id: string) => {
    return RevenueModel.findById(id);
  },

  getRevenuesByDateRange: (startDate: Date, endDate: Date, source?: string, receiveType?: string) => {
    const filter: FilterQuery<IRevenue> = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (source) {
      filter.source = source;
    }
    if (receiveType) {
      filter.receiveType = receiveType;
    }
    
    return RevenueModel.find(filter).sort({ date: -1 });
  },

  /**
   * Search revenues with pagination and filters
   */
  searchRevenues: async (filters: {
    searchQuery?: string;
    isBlocked?: boolean;
    source?: string;
    receiveType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const { searchQuery, isBlocked, source, receiveType, startDate, endDate, page = 1, limit = 10 } = filters;
    
    // Build filter object
    const filter: any = {};
    
    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked;
    }
    
    if (source) {
      filter.source = source;
    }
    
    if (receiveType) {
      filter.receiveType = receiveType;
    }
    
    // Build date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate + 'T23:59:59.999Z'); // Include the entire end date
      }
    }
    
    // Build search query
    if (searchQuery) {
      filter.$or = [
        { description: { $regex: searchQuery, $options: 'i' } },
        { source: { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalRevenues = await RevenueModel.countDocuments(filter);
    
    // Get paginated results
    const revenues = await RevenueModel.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
    
    return {
      revenues,
      pagination: {
        totalRevenues,
        currentPage: page,
        totalPages: Math.ceil(totalRevenues / limit),
        limit,
        hasNextPage: page < Math.ceil(totalRevenues / limit),
        hasPrevPage: page > 1
      }
    };
  },
};
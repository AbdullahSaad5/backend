import { OrderTaskType } from "@/models/order-task-type.model";
import { IOrderTaskTypeCreatePayload, IOrderTaskTypeUpdatePayload } from "@/contracts/order-task-type.contract";
import { Types } from "mongoose";

export const orderTaskTypeService = {
  createOrderTaskType: (data: IOrderTaskTypeCreatePayload) => {
    const newOrderTaskType = new OrderTaskType(data);
    return newOrderTaskType.save();
  },

  getAllOrderTaskTypes: () => {
    return OrderTaskType.find()
      .populate("relevantCategories", "name")
      .populate("defaultAssignedRole", "role")
      .populate("defaultAssignedTeam", "name");
  },

  getOrderTaskTypeById: (id: string) => {
    return OrderTaskType.findById(id)
      .populate("relevantCategories", "name")
      .populate("defaultAssignedRole", "role")
      .populate("defaultAssignedTeam", "name");
  },

  getOrderTaskTypeByTaskTypeId: (taskTypeId: string) => {
    return OrderTaskType.findOne({ taskTypeId })
      .populate("relevantCategories", "name")
      .populate("defaultAssignedRole", "role")
      .populate("defaultAssignedTeam", "name");
  },

  updateOrderTaskType: (id: string, data: IOrderTaskTypeUpdatePayload) => {
    return OrderTaskType.findByIdAndUpdate(id, data, { new: true }).populate("relevantCategories", "name");
  },

  deleteOrderTaskType: (id: string) => {
    return OrderTaskType.findByIdAndDelete(id);
  },

  getOrderTaskTypesByCategory: (categoryId: string) => {
    return OrderTaskType.find({
      $or: [{ relevantCategories: new Types.ObjectId(categoryId) }, { relevantCategories: "All" }],
    }).populate("relevantCategories", "name");
  },

  getOrderTaskTypesByCondition: (condition: string) => {
    return OrderTaskType.find({
      $or: [{ relevantConditions: condition }, { relevantConditions: "All" }],
    }).populate("relevantCategories", "name");
  },

  getOrderLevelTaskTypes: () => {
    return OrderTaskType.find({ isOrderLevel: true }).populate("relevantCategories", "name");
  },
};

import { Order } from "@/models/order.model";
import { OrderTask } from "@/models/order-task.model";
import { ProductTypeWorkflow } from "@/models/product-type-workflow.model";
import { IOrder, IOrderUpdatePayload, OrderStatus, SourcePlatform, PaymentStatus } from "@/contracts/order.contract";
import { Types } from "mongoose";

export const orderService = {
  // Create a new order
  createOrder: async (orderData: Partial<IOrder>) => {
    try {
      // 1) Create and persist the order
      const newOrder = new Order(orderData);
      await newOrder.save();

      // 2) Resolve relevant workflows ONCE for all item conditions for efficiency
      const appliesToOrderType = newOrder.type ?? ("SALE" as any);
      const itemConditions = Array.from(
        new Set((newOrder.items || []).map((it: any) => (it?.condition as unknown as string) || ""))
      ).filter(Boolean);

      const workflows = await ProductTypeWorkflow.find({
        isActive: true,
        $or: [{ appliesToOrderType: appliesToOrderType }, { appliesToOrderType: "ANY" }],
        $and: [
          {
            $or: [
              { appliesToCondition: "any" },
              ...(itemConditions.length > 0 ? itemConditions.map((c) => ({ appliesToCondition: c })) : []),
            ],
          },
        ],
      })
        .populate({ path: "steps.taskTypeId" })
        .lean();

      // 3) For each item, pick matching workflows and create tasks tied to that item
      const createdTaskIds: Types.ObjectId[] = [];
      for (const item of newOrder.items || []) {
        const itemCondition = (item?.condition as unknown as string) || undefined;

        const matchingForItem = workflows
          .filter((wf: any) => {
            return wf.appliesToOrderType === appliesToOrderType || wf.appliesToOrderType === "ANY";
            // Condition already filtered above; include all with 'any' or matching item condition
          })
          .filter((wf: any) => wf.appliesToCondition === "any" || wf.appliesToCondition === itemCondition);

        // For each physical unit (quantity), create a separate set of tasks
        const quantityCount = Math.max(Number(item?.quantity ?? 1), 1);
        for (let unitIndex = 1; unitIndex <= quantityCount; unitIndex++) {
          for (const wf of matchingForItem) {
            const steps = [...(wf.steps || [])];
            const stepIdToTaskId: Record<string, Types.ObjectId> = {};

            // First pass: create all tasks without dependencies
            for (const step of steps) {
              const taskType: any = step.taskTypeId;

              const baseEstimated = taskType?.defaultEstimatedTimeMinutes ?? 30;
              const basePriority = taskType?.defaultPriority ?? 2;
              const baseAssignedRole = taskType?.defaultAssignedRole ?? null;
              const baseName = taskType?.name ?? "Workflow Task";

              const estimatedTimeMinutes = step.overrideEstimatedTimeMinutes ?? baseEstimated;
              const priority = step.overridePriority ?? basePriority;
              const defaultAssignedRole = step.overrideDefaultAssignedRole ?? baseAssignedRole;
              const name = quantityCount > 1 ? `${baseName} (unit ${unitIndex}/${quantityCount})` : baseName;

              // Initially set all tasks as Ready, we'll update dependencies in the second pass
              const taskDoc = await OrderTask.create({
                orderId: newOrder._id,
                orderItemId: item?.itemId ?? null,
                taskTypeId: taskType?._id,
                name,
                priority,
                estimatedTimeMinutes,
                status: "Ready",
                isCustom: false,
                defaultAssignedRole: defaultAssignedRole,
                dependentOnTaskIds: [],
                pendingDependenciesCount: 0,
                externalRefId: item?.itemId ? `${item.itemId}:${unitIndex}` : undefined,
                logs: [
                  {
                    userName: "System",
                    action: "Task created from workflow",
                    details: `Workflow ${wf.name} step ${step.id} for item ${item?.itemId ?? "n/a"} unit ${unitIndex}/${quantityCount}`,
                    timestamp: new Date(),
                  },
                ],
              });

              stepIdToTaskId[step.id] = taskDoc._id as Types.ObjectId;
              createdTaskIds.push(taskDoc._id as Types.ObjectId);
            }

            // Second pass: update dependencies
            for (const step of steps) {
              if (Array.isArray(step.dependsOnSteps) && step.dependsOnSteps.length > 0) {
                const dependentOnTaskIds: Types.ObjectId[] = [];

                for (const dependencyStepId of step.dependsOnSteps) {
                  const dependencyTaskId = stepIdToTaskId[dependencyStepId];
                  if (dependencyTaskId) {
                    dependentOnTaskIds.push(dependencyTaskId);
                  }
                }

                if (dependentOnTaskIds.length > 0) {
                  const currentTaskId = stepIdToTaskId[step.id];
                  if (currentTaskId) {
                    await OrderTask.findByIdAndUpdate(currentTaskId, {
                      status: "Pending",
                      dependentOnTaskIds,
                      pendingDependenciesCount: dependentOnTaskIds.length,
                    });
                  }
                }
              }
            }
          }
        }
      }

      if (createdTaskIds.length > 0) {
        await Order.findByIdAndUpdate(
          newOrder._id,
          { $addToSet: { taskIds: { $each: createdTaskIds } } },
          { new: true }
        );
      }

      const populatedOrder = await Order.findById(newOrder._id)
        .populate("taskIds", "name status priority estimatedTimeMinutes orderItemId")
        .lean();

      return populatedOrder ?? newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      throw new Error("Failed to create order");
    }
  },

  // Get all orders with optional filtering and pagination
  getAllOrders: async (
    filters: {
      status?: OrderStatus;
      sourcePlatform?: SourcePlatform;
      paymentStatus?: PaymentStatus;
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) => {
    try {
      const {
        status,
        sourcePlatform,
        paymentStatus,
        customerId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      // Build query
      const query: any = {};

      if (status) query.status = status;
      if (sourcePlatform) query.sourcePlatform = sourcePlatform;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      if (customerId) query.customerId = new Types.ObjectId(customerId);

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .populate("customer", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku")
        .populate("taskIds", "name status")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const total = await Order.countDocuments(query);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to retrieve orders");
    }
  },

  // Get order by ID with full population
  getOrderById: async (orderId: string) => {
    try {
      const order = await Order.findById(orderId)
        .populate("customer")
        .populate("customerId")
        .populate("items.productId")
        .populate("products.product")
        .populate("taskIds")
        .populate("originalOrderId")
        .populate("replacementDetails.replacementOrderId")
        .populate("createdBy")
        .populate("updatedBy");

      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw new Error("Failed to retrieve order");
    }
  },

  // Get order by order ID (custom orderId field)
  getOrderByOrderId: async (orderId: string) => {
    try {
      const order = await Order.findOne({ orderId })
        .populate("customer")
        .populate("customerId")
        .populate("items.productId")
        .populate("products.product")
        .populate("taskIds")
        .populate("originalOrderId")
        .populate("replacementDetails.replacementOrderId")
        .populate("createdBy")
        .populate("updatedBy");

      if (!order) {
        throw new Error("Order not found");
      }
      return order;
    } catch (error) {
      console.error("Error fetching order by orderId:", error);
      throw new Error("Failed to retrieve order");
    }
  },

  // Update order by ID
  updateOrderById: async (orderId: string, data: IOrderUpdatePayload) => {
    try {
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      )
        .populate("customer", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku");

      if (!updatedOrder) {
        throw new Error("Order not found");
      }
      return updatedOrder;
    } catch (error) {
      console.error("Error updating order:", error);
      throw new Error("Failed to update order");
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: OrderStatus, updatedBy?: string) => {
    try {
      const updateData: any = { status, updatedAt: new Date() };

      // Add timestamp based on status
      switch (status) {
        case "SHIPPED":
          updateData.shippedAt = new Date();
          break;
        case "DELIVERED":
          updateData.deliveredAt = new Date();
          break;
        case "COMPLETED":
          updateData.completedAt = new Date();
          break;
      }

      if (updatedBy) {
        updateData.updatedBy = new Types.ObjectId(updatedBy);
      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
        new: true,
        runValidators: true,
      }).populate("customer", "firstName lastName email");

      if (!updatedOrder) {
        throw new Error("Order not found");
      }
      return updatedOrder;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw new Error("Failed to update order status");
    }
  },

  // Delete order by ID
  deleteOrderById: async (orderId: string) => {
    try {
      const deletedOrder = await Order.findByIdAndDelete(orderId);
      if (!deletedOrder) {
        throw new Error("Order not found");
      }
      return deletedOrder;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw new Error("Failed to delete order");
    }
  },

  // Get orders by customer ID
  getOrdersByCustomerId: async (customerId: string, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const orders = await Order.find({ customerId: new Types.ObjectId(customerId) })
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments({ customerId: new Types.ObjectId(customerId) });

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      throw new Error("Failed to retrieve customer orders");
    }
  },

  // Get orders by status
  getOrdersByStatus: async (status: OrderStatus, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const orders = await Order.find({ status })
        .populate("customer", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments({ status });

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching orders by status:", error);
      throw new Error("Failed to retrieve orders by status");
    }
  },

  // Get orders by platform
  getOrdersByPlatform: async (sourcePlatform: SourcePlatform, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const orders = await Order.find({ sourcePlatform })
        .populate("customer", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments({ sourcePlatform });

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching orders by platform:", error);
      throw new Error("Failed to retrieve orders by platform");
    }
  },

  // Search orders
  searchOrders: async (searchTerm: string, page = 1, limit = 10) => {
    try {
      const skip = (page - 1) * limit;

      const searchQuery = {
        $or: [
          { orderId: { $regex: searchTerm, $options: "i" } },
          { orderNumber: { $regex: searchTerm, $options: "i" } },
          { "customerDetails.firstName": { $regex: searchTerm, $options: "i" } },
          { "customerDetails.lastName": { $regex: searchTerm, $options: "i" } },
          { "customerDetails.email": { $regex: searchTerm, $options: "i" } },
          { trackingNumber: { $regex: searchTerm, $options: "i" } },
          { externalOrderId: { $regex: searchTerm, $options: "i" } },
        ],
      };

      const orders = await Order.find(searchQuery)
        .populate("customer", "firstName lastName email")
        .populate("customerId", "firstName lastName email")
        .populate("items.productId", "name sku")
        .populate("products.product", "name sku")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Order.countDocuments(searchQuery);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching orders:", error);
      throw new Error("Failed to search orders");
    }
  },

  // Get order statistics
  getOrderStatistics: async (
    filters: {
      startDate?: Date;
      endDate?: Date;
      sourcePlatform?: SourcePlatform;
    } = {}
  ) => {
    try {
      const { startDate, endDate, sourcePlatform } = filters;

      const query: any = {};
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }
      if (sourcePlatform) query.sourcePlatform = sourcePlatform;

      const [totalOrders, pendingOrders, completedOrders, cancelledOrders, totalRevenue, averageOrderValue] =
        await Promise.all([
          Order.countDocuments(query),
          Order.countDocuments({ ...query, status: { $in: ["PENDING_PAYMENT", "PENDING_ADMIN_CONFIGURATION"] } }),
          Order.countDocuments({ ...query, status: { $in: ["COMPLETED", "DELIVERED"] } }),
          Order.countDocuments({ ...query, status: "CANCELLED" }),
          Order.aggregate([
            { $match: { ...query, status: { $in: ["COMPLETED", "DELIVERED"] } } },
            { $group: { _id: null, total: { $sum: "$grandTotal" } } },
          ]),
          Order.aggregate([
            { $match: { ...query, status: { $in: ["COMPLETED", "DELIVERED"] } } },
            { $group: { _id: null, average: { $avg: "$grandTotal" } } },
          ]),
        ]);

      return {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        averageOrderValue: averageOrderValue[0]?.average || 0,
      };
    } catch (error) {
      console.error("Error fetching order statistics:", error);
      throw new Error("Failed to retrieve order statistics");
    }
  },

  // Create refund order
  createRefundOrder: async (
    originalOrderId: string,
    refundData: {
      reason: string;
      refundAmount: number;
      itemsToRefund?: string[];
      createdBy?: string;
    }
  ) => {
    try {
      const originalOrder = await Order.findById(originalOrderId);
      if (!originalOrder) {
        throw new Error("Original order not found");
      }

      const refundOrder = new Order({
        type: "REFUND",
        originalOrderId: originalOrder._id,
        reason: refundData.reason,
        sourcePlatform: originalOrder.sourcePlatform,
        customerId: originalOrder.customerId,
        customerDetails: originalOrder.customerDetails,
        email: originalOrder.email,
        shippingAddress: originalOrder.shippingAddress,
        billingAddress: originalOrder.billingAddress,
        currency: originalOrder.currency,
        refundDetails: {
          refundAmount: refundData.refundAmount,
          refundStatus: "PENDING",
        },
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        createdBy: refundData.createdBy ? new Types.ObjectId(refundData.createdBy) : undefined,
      });

      await refundOrder.save();
      return refundOrder;
    } catch (error) {
      console.error("Error creating refund order:", error);
      throw new Error("Failed to create refund order");
    }
  },

  // Create replacement order
  createReplacementOrder: async (
    originalOrderId: string,
    replacementData: {
      reason: string;
      items: any[];
      createdBy?: string;
    }
  ) => {
    try {
      const originalOrder = await Order.findById(originalOrderId);
      if (!originalOrder) {
        throw new Error("Original order not found");
      }

      const replacementOrder = new Order({
        type: "REPLACEMENT",
        originalOrderId: originalOrder._id,
        reason: replacementData.reason,
        sourcePlatform: originalOrder.sourcePlatform,
        customerId: originalOrder.customerId,
        customerDetails: originalOrder.customerDetails,
        email: originalOrder.email,
        shippingAddress: originalOrder.shippingAddress,
        billingAddress: originalOrder.billingAddress,
        items: replacementData.items,
        currency: originalOrder.currency,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        createdBy: replacementData.createdBy ? new Types.ObjectId(replacementData.createdBy) : undefined,
      });

      await replacementOrder.save();
      return replacementOrder;
    } catch (error) {
      console.error("Error creating replacement order:", error);
      throw new Error("Failed to create replacement order");
    }
  },
};

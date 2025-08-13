import { ProcessedPayroll } from "../models/processedpayroll.model";
import { IProcessedPayroll } from "../contracts/processedpayroll.contract";
import { PayrollType } from "../contracts/payroll.contract";

export const processedPayrollService = {
  async createProcessedPayroll(data: Partial<IProcessedPayroll>) {
    if (!data.employeeId || !data.payrollPeriod?.start) {
      throw new Error("Employee and payroll period start date are required.");
    }

    // Get the first and last day of the month for the given start date
    const startDate = new Date(data.payrollPeriod.start);
    const monthStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Check if a payroll already exists for this user, month, and payroll type
    const existing = await ProcessedPayroll.findOne({
      employeeId: data.employeeId,
      payrollType: data.payrollType || PayrollType.ACTUAL,
      "payrollPeriod.start": { $gte: monthStart, $lte: monthEnd },
    });

    if (existing) {
      throw new Error(
        `${data.payrollType || "ACTUAL"} payroll for that month already exists.`
      );
    }

    const processedPayroll = new ProcessedPayroll(data);
    return await processedPayroll.save();
  },

  async createDualProcessedPayrolls(
    actualData: Partial<IProcessedPayroll>,
    governmentData: Partial<IProcessedPayroll>
  ) {
    console.log("createDualProcessedPayrolls service called with:", {
      actualData,
      governmentData,
    });

    if (!actualData.employeeId || !actualData.payrollPeriod?.start) {
      throw new Error("Employee and payroll period start date are required.");
    }

    // Get the first and last day of the month for the given start date
    const startDate = new Date(actualData.payrollPeriod.start);
    const monthStart = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Check if payrolls already exist for this user and month
    const existingPayrolls = await ProcessedPayroll.find({
      employeeId: actualData.employeeId,
      "payrollPeriod.start": { $gte: monthStart, $lte: monthEnd },
    });

    if (existingPayrolls.length > 0) {
      throw new Error(
        `Payrolls for that month already exist. Please delete existing payrolls first.`
      );
    }

    // Create both actual and government processed payrolls
    const actualPayroll = new ProcessedPayroll({
      ...actualData,
      payrollType: PayrollType.ACTUAL,
    });

    const governmentPayroll = new ProcessedPayroll({
      ...governmentData,
      payrollType: PayrollType.GOVERNMENT,
    });

    // Save both payrolls
    console.log("Saving actual payroll:", actualPayroll);
    const savedActualPayroll = await actualPayroll.save();
    console.log("Saved actual payroll:", savedActualPayroll);

    console.log("Saving government payroll:", governmentPayroll);
    const savedGovernmentPayroll = await governmentPayroll.save();
    console.log("Saved government payroll:", savedGovernmentPayroll);

    return { actual: savedActualPayroll, government: savedGovernmentPayroll };
  },

  async getAllProcessedPayrolls() {
    return await ProcessedPayroll.find()
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email")
      .sort({ createdAt: -1 });
  },

  async getProcessedPayrollById(id: string) {
    return await ProcessedPayroll.findById(id)
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");
  },

  async getProcessedPayrollsByEmployeeAndPeriod(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ) {
    return await ProcessedPayroll.find({
      employeeId,
      "payrollPeriod.start": startDate,
      "payrollPeriod.end": endDate,
    })
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");
  },

  async updateProcessedPayrollById(
    id: string,
    update: Partial<IProcessedPayroll>
  ) {
    const result = await ProcessedPayroll.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");

    return result;
  },

  async updateDualProcessedPayrolls(
    actualId: string,
    governmentId: string,
    actualUpdate: Partial<IProcessedPayroll>,
    governmentUpdate: Partial<IProcessedPayroll>
  ) {
    const actualPayroll = await this.updateProcessedPayrollById(
      actualId,
      actualUpdate
    );
    const governmentPayroll = await this.updateProcessedPayrollById(
      governmentId,
      governmentUpdate
    );

    return { actual: actualPayroll, government: governmentPayroll };
  },

  async getMergedProcessedPayrollByUserId(
    userId: string,
    month: number,
    year: number
  ) {
    // Calculate the start and end of the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Find both actual and government payrolls for this user and month
    const payrolls = await ProcessedPayroll.find({
      employeeId: userId,
      "payrollPeriod.start": { $gte: monthStart, $lte: monthEnd },
    })
      .populate("employeeId", "firstName lastName email")
      .populate("processedBy", "firstName lastName email");

    const actualPayroll = payrolls.find((p) => p.payrollType === "ACTUAL");
    const governmentPayroll = payrolls.find(
      (p) => p.payrollType === "GOVERNMENT"
    );

    // Get employee name from either payroll
    const getEmployeeName = (user: any) => {
      if (user?.firstName && user?.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      if (user?.firstName) {
        return user.firstName;
      }
      if (user?.lastName) {
        return user.lastName;
      }
      if (user?.email) {
        const emailName = user.email.split("@")[0];
        return emailName
          .replace(/[._]/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      return "Unknown Employee";
    };

    const userData = actualPayroll?.employeeId || governmentPayroll?.employeeId;
    const employeeName = getEmployeeName(userData);

    console.log("Backend service - userId:", userId, "type:", typeof userId);
    console.log(
      "Backend service - actualPayroll?.employeeId:",
      actualPayroll?.employeeId,
      "type:",
      typeof actualPayroll?.employeeId
    );
    console.log(
      "Backend service - governmentPayroll?.employeeId:",
      governmentPayroll?.employeeId,
      "type:",
      typeof governmentPayroll?.employeeId
    );

    // Return merged structure
    const result = {
      _id: actualPayroll?._id || governmentPayroll?._id,
      employeeId: String(userId), // Ensure employeeId is always a string
      employeeName: employeeName,
      payrollPeriod:
        actualPayroll?.payrollPeriod || governmentPayroll?.payrollPeriod,
      contractType:
        actualPayroll?.contractType || governmentPayroll?.contractType,
      actualPayroll: actualPayroll
        ? {
            ...actualPayroll.toObject(),
            employeeId: String(userId), // Ensure employeeId is a string in actualPayroll
          }
        : undefined,
      governmentPayroll: governmentPayroll
        ? {
            ...governmentPayroll.toObject(),
            employeeId: String(userId), // Ensure employeeId is a string in governmentPayroll
          }
        : undefined,
      hasDualPayrolls: !!(actualPayroll && governmentPayroll),
      processedAt: actualPayroll?.processedAt || governmentPayroll?.processedAt,
    };

    console.log(
      "Backend service - final result employeeId:",
      result.employeeId,
      "type:",
      typeof result.employeeId
    );
    return result;
  },

  async updateMergedProcessedPayroll(
    userId: string,
    month: number,
    year: number,
    updateData: any
  ) {
    // Calculate the start and end of the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Find existing payrolls
    const existingPayrolls = await ProcessedPayroll.find({
      employeeId: userId,
      "payrollPeriod.start": { $gte: monthStart, $lte: monthEnd },
    });

    const actualPayroll = existingPayrolls.find(
      (p) => p.payrollType === "ACTUAL"
    );
    const governmentPayroll = existingPayrolls.find(
      (p) => p.payrollType === "GOVERNMENT"
    );

    let updatedActual, updatedGovernment;

    // Update actual payroll if it exists
    if (actualPayroll) {
      const actualUpdateData = {
        ...updateData.actualPayroll,
        // Always apply root level status if it exists
        ...(updateData.status !== undefined && { status: updateData.status }),
      };

      if (Object.keys(actualUpdateData).length > 0) {
        updatedActual = await this.updateProcessedPayrollById(
          (actualPayroll as any)._id.toString(),
          actualUpdateData
        );
      } else {
        updatedActual = actualPayroll;
      }
    }

    // Update government payroll if it exists
    if (governmentPayroll) {
      const governmentUpdateData = {
        ...updateData.governmentPayroll,
        // Always apply root level status if it exists
        ...(updateData.status !== undefined && { status: updateData.status }),
      };

      if (Object.keys(governmentUpdateData).length > 0) {
        updatedGovernment = await this.updateProcessedPayrollById(
          (governmentPayroll as any)._id.toString(),
          governmentUpdateData
        );
      } else {
        updatedGovernment = governmentPayroll;
      }
    }

    const result = {
      actual: updatedActual || actualPayroll,
      government: updatedGovernment || governmentPayroll,
    };

    return result;
  },
};

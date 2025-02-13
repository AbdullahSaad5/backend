import { Document, Types } from "mongoose";

interface IDiscount extends Document {
  fixedDiscountValue: number;
  percentageDiscountValue: number;

  applicableCategory?: Types.ObjectId;
}

export { IDiscount };

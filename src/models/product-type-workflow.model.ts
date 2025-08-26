import { ENUMS } from "@/constants/enum";
import { generateUniqueId } from "@/utils/generate-unique-id.util";
import { model, Schema } from "mongoose";
import { IProductTypeWorkflow, ProductTypeWorkflowModel } from "@/contracts/product-type-workflow.contract";

const ProductTypeWorkflowSchema = new Schema<IProductTypeWorkflow>(
  {
    workflowId: { type: String, unique: true, default: () => generateUniqueId("WFL") },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    appliesToCategory: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true },
    appliesToCondition: {
      type: String,
      enum: ENUMS.PRODUCT_CONDITIONS,
      default: "any",
    },
    appliesToOrderType: {
      type: String,
      enum: ENUMS.APPLIES_TO_ORDER_TYPE,
      required: true,
      default: "SALE",
    },
    steps: [
      {
        _id: false,
        stepOrder: { type: Number, required: false },
        taskTypeId: { type: Schema.Types.ObjectId, ref: "OrderTaskType", required: true },
        overrideEstimatedTimeMinutes: { type: Number, min: 1 },
        overridePriority: { type: Number, enum: [1, 2, 3] },
        overrideDefaultAssignedRole: { type: Schema.Types.ObjectId, ref: "UserCategory" },
        dependsOnSteps: [{ type: String, trim: true }],
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ProductTypeWorkflow: ProductTypeWorkflowModel = model<IProductTypeWorkflow>(
  "ProductTypeWorkflow",
  ProductTypeWorkflowSchema
);

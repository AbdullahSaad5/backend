import { postagePolicyService } from "@/services";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export const postagePolicyController = {

  createPostagePolicy: async (req: Request, res: Response) => {
    try {
    //   const { policyName, policyDescription, immediatePayment, cashOnPickUp } = req.body;
      console.log(req.body);

      const paymentPolicy = await postagePolicyService.createPostagePolicy(req.body);

      res.status(StatusCodes.CREATED).json({
        message: "Postage policy created successfully",
        paymentPolicy: paymentPolicy,
      });
    } catch (error: any) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating postage policy" });
    }
  },

  getAllPostagePolicy: async (req: Request, res: Response) => {
    try {
      // console.log("Hello")
      const postagePolicies = await postagePolicyService.getAllPostagePolicies();
      res.status(StatusCodes.OK).json(postagePolicies);
    } catch (error: any) {
      console.log(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching postage policies", error: error });
    }
  },

  getSpecificPolicy: async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const result = await postagePolicyService.getById(id);
      if (!result) return res.status(404).json({ message: "Policy not found" });
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      console.error("View Policy Error:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Error getting policy" });
    }
  },

  editPolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const policy = await postagePolicyService.editPolicy(id, req.body);
      res.status(StatusCodes.OK).json({ success: true, message: "Policy updated successfully", data: policy });
    } catch (error) {
      console.error("Edit Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating policy" });
    }
  },

  deletePolicy: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await postagePolicyService.deletePolicy(id);
      res.status(StatusCodes.OK).json({ success: true, message: "Policy deleted successfully", deletedPolicy: result });
    } catch (error) {
      console.error("Delete Policy Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting policy" });
    }
  },

};

import { faqsPolicyService } from "@/services/faqs-policy.service";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";



export const faqsPolicyController = {
    createFaqsPolicy: async (req: Request, res: Response) => {
        try {
          const faqsPolicy = await faqsPolicyService.createFaqsPolicy(req.body);
    
          res.status(StatusCodes.CREATED).json({
            message: "Faqs policy created successfully",
            faqsPolicy: faqsPolicy,
          });
        } catch (error: any) {
          console.error(error);
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error creating faqs policy" });
        }
      },
      getAllFaqsPolicy: async (req: Request, res: Response) => {
          try {
            // console.log("Hello")
            const faqsPolicies = await faqsPolicyService.getAllFaqsPolicies();
            res.status(StatusCodes.OK).json(faqsPolicies);
          } catch (error: any) {
            console.log(error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Error fetching Faqs", error: error });
          }
        },
        
        editFaqs: async (req: Request, res: Response) => {
            try {
              const { id } = req.params;
              const { faqsQuestion, faqsAnswer, faqsCategory } = req.body;
              const policy = await faqsPolicyService.editFaqs(id, {
                faqsQuestion, 
                faqsAnswer, 
                faqsCategory,
              });
              res.status(StatusCodes.OK).json({ success: true, message: "Faqs updated successfully", data: policy });
            } catch (error) {
              console.error("Edit Faqs Error:", error);
              res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error updating faqs" });
            }
          },

        

        deleteFaqs: async (req: Request, res: Response) => {
            try {
              const { id } = req.params;
              const result = await faqsPolicyService.deleteFaqs(id);
              res.status(StatusCodes.OK).json({ success: true, message: "Faqs deleted successfully", deletedPolicy: result });
            } catch (error) {
              console.error("Delete Policy Error:", error);
              res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error deleting faqs" });
            }
          },
} 
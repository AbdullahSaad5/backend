import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
export const workshiftController = {
    createworkshift : async (req: Request, res: Response)=>{
    try {
        const{shiftName, mode, employees, startTime, endTime, description} = req.body
        const response = await workshiftService.createworkshift({shiftName, mode, employees, startTime, endTime, description}, {new : true})
     res.status(StatusCodes.CREATED).json({
            success: true,
            message: "Complaint created successfully",
            data: response
          });
        } catch (error) {
          console.error("Error creating complaint:", error);
          res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to create complaint"
          });
        }
      },

}
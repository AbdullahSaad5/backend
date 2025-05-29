import { tickerControler } from "@/controllers/ticket.controller";
import { Router } from "express";

export const ticket = (router: Router)=>{
     router.post(
        "/",
        // BlogValidation.addblog,
        tickerControler.addticket
      );
    
      router.get("/", tickerControler.getAllTicket);
    
      router.patch(
        "/:id",
        // BlogValidation.editblog,
        tickerControler.editTicket
      );
    
      router.delete(
        "/:id",
        // BlogValidation.validateId,
        tickerControler.deleteTicket
      );
    
      router.get(
        "/:id",
        // BlogValidation.validateId,
        tickerControler.getSpecificTicket
      );
      router.patch(
        "/:id/status",
        // BlogValidation.editblog,
        tickerControler.toggleticketstatus
      );
      router.patch(
        "/:id/priority",
        tickerControler.toggleprioritystatus
      )
      router.patch(
        "/:id/department",
        tickerControler.toggledepartmentstatus
      )
      router.patch("/:ticketId/resolution", tickerControler.addResolution)
}
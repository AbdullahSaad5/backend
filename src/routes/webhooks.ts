import express from "express";
import { EmailModel } from "@/models/email.model";
import { EmailProcessingService } from "@/services/email-processing.service";
import { ISNSEmailNotification, ISESEmailEvent } from "@/contracts/mailbox.contract";

const router = express.Router();

// AWS SNS Notification handler
router.post("/sns", async (req, res) => {
  try {
    const notification: ISNSEmailNotification = req.body;

    // Assume the message is a stringified JSON object
    const parsedMessage = JSON.parse(notification.Message) as ISESEmailEvent;

    const processingResult = await EmailProcessingService.processIncomingEmail(parsedMessage);

    if (processingResult.success) {
      res.status(200).send("Success");
    } else {
      res.status(400).send(`Error: ${processingResult.error}`);
    }
  } catch (error) {
    console.error("Failed to process SNS notification", error);
    res.status(500).send("Internal Server Error");
  }
});

export const WebhooksRouter = router;

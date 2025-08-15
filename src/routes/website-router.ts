import { Router } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { website } from "./website.route";

const websiteRouter: Router = Router();

// Website routes
website(websiteRouter);

// 404 handler for website routes
websiteRouter.all("*", (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: ReasonPhrases.NOT_FOUND,
    status: StatusCodes.NOT_FOUND,
  });
});

export { websiteRouter }; 
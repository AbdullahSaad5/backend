import { Router } from "express";
import { ProfitReportingController } from "@/controllers/profit-reporting.controller";

export const profitReporting = (router: Router) => {
  // Generate profit report for date range
  router.post("/generate", ProfitReportingController.generateProfitReport);

  // Generate time-based expense and revenue report
  router.post("/time-based", ProfitReportingController.generateTimeBasedReport);

  // Download profit report as PDF
  router.post("/download-pdf", ProfitReportingController.downloadProfitReportPDF);
};

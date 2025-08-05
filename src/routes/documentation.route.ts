import { Router } from "express";
import { ApiDocumentation } from "../utils/api-documentation.util";
import { documentationConfig } from "../config/documentation.config";

const router: Router = Router();

export const documentation = (router: Router) => {
  // Get all API endpoints
  router.get("/endpoints", (req, res) => {
    try {
      const apiDoc = new ApiDocumentation(req.app, documentationConfig);
      const report = apiDoc.generateReport();
      res.json(report);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to generate endpoint documentation" });
    }
  });

  // Get API endpoints as HTML
  router.get("/endpoints/html", (req, res) => {
    try {
      const apiDoc = new ApiDocumentation(req.app, documentationConfig);
      const html = apiDoc.generateEndpointList();
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate HTML documentation" });
    }
  });

  // Get API endpoints as JSON
  router.get("/endpoints/json", (req, res) => {
    try {
      const apiDoc = new ApiDocumentation(req.app, documentationConfig);
      const json = apiDoc.exportToJson();
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="api-endpoints.json"'
      );
      res.send(json);
    } catch (error) {
      res.status(500).json({ error: "Failed to export JSON documentation" });
    }
  });

  // Get API endpoints as CSV
  router.get("/endpoints/csv", (req, res) => {
    try {
      const apiDoc = new ApiDocumentation(req.app, documentationConfig);
      const csv = apiDoc.exportToCsv();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="api-endpoints.csv"'
      );
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export CSV documentation" });
    }
  });

  // Documentation service health check
  router.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: documentationConfig.version,
      message: "Documentation service is running",
    });
  });
};

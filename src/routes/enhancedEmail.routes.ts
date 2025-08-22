// Enhanced Email Routes
// Provides all enhanced email functionality endpoints

import express from "express";
import EnhancedEmailControllerNew from "../controllers/enhancedEmailNew.controller";

const router = express.Router();

// Base path: /api/enhanced-emails

// EMAIL FETCHING ENDPOINTS
router.get("/:accountId", EnhancedEmailControllerNew.getEmails);
router.get("/:accountId/categories/:category", EnhancedEmailControllerNew.getEmailsByCategory);
router.get("/:accountId/search", EnhancedEmailControllerNew.searchEmails);

// THREAD MANAGEMENT ENDPOINTS
router.get("/:accountId/threads", EnhancedEmailControllerNew.getAllThreads);
router.get("/threads/:accountId/:threadId", EnhancedEmailControllerNew.getThread);

// EMAIL OPERATIONS ENDPOINTS
router.post("/:accountId/send", EnhancedEmailControllerNew.sendEmail);
router.post("/:accountId/reply", EnhancedEmailControllerNew.replyToEmail);
router.post("/:accountId/forward", EnhancedEmailControllerNew.forwardEmail);

// SYNC AND STATUS ENDPOINTS
router.post("/:accountId/sync", EnhancedEmailControllerNew.syncEmails);
router.get("/:accountId/sync-status", EnhancedEmailControllerNew.getSyncStatus);
router.get("/:accountId/stats", EnhancedEmailControllerNew.getEmailStats);

// EMAIL MANAGEMENT ENDPOINTS
router.put("/:accountId/:emailId/mark-read", EnhancedEmailControllerNew.markEmailRead);
router.delete("/:accountId/:emailId", EnhancedEmailControllerNew.deleteEmail);

// ENHANCED FEATURES ENDPOINTS
router.get("/:accountId/analytics", EnhancedEmailControllerNew.getEmailAnalytics);
router.post("/:accountId/bulk-actions", EnhancedEmailControllerNew.bulkEmailActions);

export default router;

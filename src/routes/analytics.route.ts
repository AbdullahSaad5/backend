import { Router } from "express";
import { analyticsController } from "@/controllers";
import { authGuard } from "@/guards";

export const analytics = (router: Router) => {
  // User Analytics Routes
  router.get("/users/overview", authGuard.isAuth as any, analyticsController.getUserAnalyticsOverview);
  router.get("/users/registration-trends", authGuard.isAuth as any, analyticsController.getUserRegistrationTrends);
  router.get("/users/role-distribution", authGuard.isAuth as any, analyticsController.getUserRoleDistribution);
  router.get("/users/activity-distribution", authGuard.isAuth as any, analyticsController.getUserActivityDistribution);
  router.get("/users/complete", authGuard.isAuth as any, analyticsController.getCompleteUserAnalytics);

  // Future analytics routes for other modules
  // router.get("/analytics/inventory/overview", authGuard.isAuth as any, analyticsController.getInventoryAnalyticsOverview);
  // router.get("/analytics/suppliers/overview", authGuard.isAuth as any, analyticsController.getSuppliersAnalyticsOverview);
  // router.get("/analytics/accounting/overview", authGuard.isAuth as any, analyticsController.getAccountingAnalyticsOverview);
  // router.get("/analytics/leads/overview", authGuard.isAuth as any, analyticsController.getLeadsAnalyticsOverview);
};

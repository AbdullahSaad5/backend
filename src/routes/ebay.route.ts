import { ebayListingService } from "@/services";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  importEbayUserTokenFromFile,
  refreshEbayAccessToken,
  checkEbayUserAuthorization,
} from "@/utils/ebay-helpers.util";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import e, { Router } from "express";
// import ebayToken from "../../ebay_tokens.json";
import { IntegrationTokenModel } from "@/models/integration-token.model";

const baseURL = "https://api.sandbox.ebay.com";

export const ebay = (router: Router) => {
  router.get("/auth/initial", ebayListingService.getApplicationAuthToken);
  router.get("/auth/ebay", ebayListingService.getUserAuthorizationUrl);
  router.get("/auth/ebay/callback", ebayListingService.handleAuthorizationCallback);
  router.get("/auth/ebay/callback/sandbox", ebayListingService.handleAuthorizationCallbackSandbox);
  router.get("/auth/ebay/callback/client", ebayListingService.handleAuthorizationCallbackClient);
  router.get("/auth/ebay/callback/declined", ebayListingService.handleFallbackCallback);
  router.get("/auth/refresh-token", ebayListingService.handleRefreshToken);
  router.post("/auth/ebay/import-token", async (_req: Request, res: Response) => {
    try {
      const ok = await importEbayUserTokenFromFile();
      return res.status(ok ? StatusCodes.OK : StatusCodes.BAD_REQUEST).json({
        status: ok ? StatusCodes.OK : StatusCodes.BAD_REQUEST,
        message: ok ? ReasonPhrases.OK : ReasonPhrases.BAD_REQUEST,
      });
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  });

  router.get("/auth/ebay/check", async (_req: Request, res: Response) => {
    try {
      const authStatus = await checkEbayUserAuthorization();
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        ...authStatus,
      });
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  });

  router.get("/auth/ebay/test-redirect", async (_req: Request, res: Response) => {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendUrl}/dashboard?ebay_auth=success`);
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  });

  router.get("/auth/ebay/test-db", async (_req: Request, res: Response) => {
    try {
      // Test database connectivity
      const testToken = {
        provider: "ebay" as const,
        environment: "PRODUCTION" as const,
        useClient: true,
        access_token: "test_token_" + Date.now(),
        token_type: "bearer",
        expires_in: 3600,
        generated_at: Date.now(),
      };

      await IntegrationTokenModel.updateOne(
        { provider: "ebay", environment: "PRODUCTION", useClient: true },
        { $set: testToken },
        { upsert: true }
      );

      // Verify it was saved
      const savedToken = await IntegrationTokenModel.findOne({
        provider: "ebay",
        environment: "PRODUCTION",
        useClient: true,
      });

      if (savedToken) {
        return res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          message: "Database connectivity test successful",
          tokenSaved: true,
          tokenId: savedToken._id,
        });
      } else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Token was not saved to database",
          tokenSaved: false,
        });
      }
    } catch (error) {
      console.error("Database test error:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Database connectivity test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/auth/ebay/check-tokens", async (_req: Request, res: Response) => {
    try {
      // Get all eBay tokens from database
      const tokens = await IntegrationTokenModel.find({ provider: "ebay" }).sort({ createdAt: -1 });

      const tokenInfo = tokens.map((token: any) => ({
        id: token._id,
        environment: token.environment,
        useClient: token.useClient,
        hasAccessToken: !!token.access_token,
        hasRefreshToken: !!token.refresh_token,
        expiresIn: token.expires_in,
        generatedAt: token.generated_at,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      }));

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Current eBay tokens in database",
        totalTokens: tokens.length,
        tokens: tokenInfo,
      });
    } catch (error) {
      console.error("Error checking tokens:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to check tokens",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  router.get("/auth/ebay/url", async (_req: Request, res: Response) => {
    try {
      const type = process.env.EBAY_TOKEN_ENV === "sandbox" ? "sandbox" : "production";
      const authUrl = getEbayAuthURL(type);
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        authUrl,
      });
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  });

  router.post("/auth/ebay/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.body;
      if (!code) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Authorization code is required",
        });
      }

      const type = process.env.EBAY_TOKEN_ENV === "sandbox" ? "sandbox" : "production";
      const token = await exchangeCodeForAccessToken(code, type, "true");

      if (token) {
        return res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          message: "Authorization successful",
          success: true,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Failed to exchange code for token",
        });
      }
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      });
    }
  });
  router.get("/taxonomy/get-ebay-categories", ebayListingService.getEbayCategories);
  router.get("/taxonomy/get-ebay-subcategories/:categoryId", ebayListingService.getEbaySubCategories);
  router.get("/taxonomy/get-ebay-category-suggestions", ebayListingService.getEbayCategorySuggestions);
  router.get("/taxonomy/get-ebay-category-aspects/:categoryId", ebayListingService.getEbayCategoryAspects);
  router.get("/orders/get-orders", ebayListingService.getOrders);
  router.get("/orders/get-order-details/:orderId", ebayListingService.getOrderDetails);
  router.post("/account-deletion", ebayListingService.accountDeletion);
  router.get("/account-deletion", ebayListingService.accountDeletion);
  router.get("/notifications", ebayListingService.createWebhook);

  // router.get("/inventory", ebayListingService.getAllInventory);
  // router.get("/inventory/get-all-categories", ebayListingService.getAllCategories);
  router.get("/inventory/get-item-aspects/:categoryId", ebayListingService.getItemAspects);
  // router.post("/inventory/create-item", ebayListingService.createProduct);
  // router.patch("/inventory/update-item", ebayListingService.updateProduct);
  // router.delete("/inventory/delete-item/:sku", ebayListingService.deleteProduct);

  // router.post("/create-offer", ebayListingService.createOffer);
  // router.get("/get-all-offers/:sku", ebayListingService.getAllOffers);
  // router.post("/publish-offer/:offerId", ebayListingService.publishOffer);
  // router.patch("/update-offer/:offerId", ebayListingService.updateOffer);

  // router.post("/create-custom-policy", ebayListingService.createCustomPolicy);
  // router.get("/get-all-custom-policies", ebayListingService.getAllCustomPolicies);
  // router.patch(
  //   "/update-custom-policy/:policyId",
  //   ebayListingService.updateCustomPolicy
  // );

  // router.post(
  //   "/create-fulfillment-policy",
  //   ebayListingService.createFulfillmentPolicy
  // );
  // router.get(
  //   "/get-all-fulfillment-policies",
  //   ebayListingService.getAllFulfillmentPolicies
  // );

  // router.get("/get-locations", ebayListingService.getInventoryLocations);
  // router.post(
  //   "/create-location/:merchantLocationKey",
  //   ebayListingService.createInventoryLocation
  // );

  // router.post("/opt-in", ebayListingService.sellingPolicyManagementProgramOptIn);
  // router.post("/create-payment-policy", ebayListingService.createPaymentPolicy);
  // router.get("/get-all-payment-policies", ebayListingService.getAllPaymentPolicies);

  // router.post("/create-return-policy", ebayListingService.createReturnPolicy);
  // router.get("/get-all-return-policies", ebayListingService.getAllReturnPolicies);
};

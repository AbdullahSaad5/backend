import { ebayListingService } from "@/services";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  importEbayUserTokenFromFile,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";
import { Request, Response } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import e, { Router } from "express";
// import ebayToken from "../../ebay_tokens.json";

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
  router.get("/taxonomy/get-ebay-categories", ebayListingService.getEbayCategories);
  router.get("/taxonomy/get-ebay-subcategories/:categoryId", ebayListingService.getEbaySubCategories);
  router.get("/taxonomy/get-ebay-category-suggestions", ebayListingService.getEbayCategorySuggestions);
  router.get("/taxonomy/get-ebay-category-aspects/:categoryId", ebayListingService.getEbayCategoryAspects);
  router.get("/orders/get-orders", ebayListingService.getOrders);
  router.post("/account-deletion", ebayListingService.accountDeletion);
  router.get("/account-deletion", ebayListingService.accountDeletion);

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

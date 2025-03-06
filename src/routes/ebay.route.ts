import { ebayService } from "@/services";
import {
  exchangeCodeForAccessToken,
  getEbayAuthURL,
  getNormalAccessToken,
  getStoredEbayAccessToken,
  refreshEbayAccessToken,
} from "@/utils/ebay-helpers.util";
import e, { Router } from "express";
// import ebayToken from "../../ebay_tokens.json";

const baseURL = "https://api.ebay.com";

export const ebay = (router: Router) => {
  router.get("/auth/initial", ebayService.getApplicationAuthToken);
  router.get("/auth/ebay", ebayService.getUserAuthorizationUrl);
  router.get("/auth/ebay/callback", ebayService.handleAuthorizationCallback);
  router.get(
    "/auth/ebay/callback/declined",
    ebayService.handleFallbackCallback
  );
  router.get("/auth/refresh-token", ebayService.handleRefreshToken);

  router.get("/inventory", ebayService.getAllInventory);
  router.get("/inventory/get-all-categories", ebayService.getAllCategories);
  router.get(
    "/inventory/get-item-aspects/:categoryId",
    ebayService.getItemAspects
  );
  router.post("/inventory/create-item", ebayService.createProduct);
  router.patch("/inventory/update-item", ebayService.updateProduct);
  router.delete("/inventory/delete-item/:sku", ebayService.deleteProduct);

  router.post("/create-offer", ebayService.createOffer);
  router.get("/get-all-offers/:sku", ebayService.getAllOffers);
  router.post("/publish-offer/:offerId", ebayService.publishOffer);
  router.patch("/update-offer/:offerId", ebayService.updateOffer);

  router.post("/create-custom-policy", ebayService.createCustomPolicy);
  router.get("/get-all-custom-policies", ebayService.getAllCustomPolicies);
  router.patch(
    "/update-custom-policy/:policyId",
    ebayService.updateCustomPolicy
  );

  router.post(
    "/create-fulfillment-policy",
    ebayService.createFulfillmentPolicy
  );
  router.get(
    "/get-all-fulfillment-policies",
    ebayService.getAllFulfillmentPolicies
  );

  router.get("/get-locations", ebayService.getInventoryLocations);
  router.post(
    "/create-location/:merchantLocationKey",
    ebayService.createInventoryLocation
  );

  router.post("/opt-in", ebayService.sellingPolicyManagementProgramOptIn);
  router.post("/create-payment-policy", ebayService.createPaymentPolicy);
  router.get("/get-all-payment-policies", ebayService.getAllPaymentPolicies);

  router.post("/create-return-policy", ebayService.createReturnPolicy);
  router.get("/get-all-return-policies", ebayService.getAllReturnPolicies);
};

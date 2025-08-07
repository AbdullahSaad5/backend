import { Router } from "express";
import { EmailAccountController } from "@/controllers/email-account.controller";
import { authGuard } from "@/guards";
import { validateRequest, validateParams } from "@/middlewares/validation.middleware";
import { emailAccountValidation } from "@/validations/email-account.validation";

export const emailAccount = (router: Router) => {
  // Apply authentication to all email account routes
  router.use(authGuard.isAuth);

  // Get email providers
  router.get("/providers", EmailAccountController.getProviders);
  router.get("/providers/oauth", EmailAccountController.getOAuthProviders);
  router.post(
    "/detect-provider",
    validateRequest(emailAccountValidation.detectProvider),
    EmailAccountController.detectProvider
  );

  // OAuth endpoints
  router.post(
    "/oauth/google",
    // validateRequest(emailAccountValidation.initiateOAuth),
    EmailAccountController.initiateGoogleOAuth
  );
  router.get("/oauth/google/callback", EmailAccountController.handleGoogleCallback);
  router.post(
    "/oauth/outlook",
    // validateRequest(emailAccountValidation.initiateOAuth),
    EmailAccountController.initiateOutlookOAuth
  );
  router.get("/oauth/outlook/callback", EmailAccountController.handleOutlookCallback);

  // Manual account creation
  router.post(
    "/manual",
    validateRequest(emailAccountValidation.createManualAccount),
    EmailAccountController.createManualAccount
  );

  // Account management
  router.get("/accounts", EmailAccountController.getUserAccounts);
  router.get(
    "/accounts/:accountId/test",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.testConnection
  );
  router.put(
    "/accounts/:accountId",
    validateParams(emailAccountValidation.accountId),
    validateRequest(emailAccountValidation.updateAccount),
    EmailAccountController.updateAccount
  );
  router.delete(
    "/accounts/:accountId",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.deleteAccount
  );
  router.post(
    "/accounts/:accountId/refresh-tokens",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.refreshTokens
  );
};

import { Router } from "express";
import { EmailAccountController } from "@/controllers/email-account.controller";
import { authGuard } from "@/guards";
import { validateRequest, validateParams } from "@/middlewares/validation.middleware";
import { emailAccountValidation } from "@/validations/email-account.validation";

export const emailAccount = (router: Router) => {
  // OAuth callback routes (no auth required as they come from external providers)
  router.get("/oauth/google/callback", EmailAccountController.handleGoogleCallback);
  router.get("/oauth/outlook/callback", EmailAccountController.handleOutlookCallback);

  // Apply authentication to all other email account routes
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
  router.post(
    "/oauth/outlook",
    // validateRequest(emailAccountValidation.initiateOAuth),
    EmailAccountController.initiateOutlookOAuth
  );

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

  // Update account sync folders
  router.patch(
    "/:accountId/sync-folders",
    validateParams(emailAccountValidation.accountId),
    validateRequest(emailAccountValidation.updateSyncFolders),
    EmailAccountController.updateSyncFolders
  );

  // Email fetching and management routes
  router.post(
    "/accounts/:accountId/fetch-emails",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.fetchAccountEmails
  );

  // Direct email fetching without database storage (for real-time display)
  router.get(
    "/accounts/:accountId/emails-direct",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.fetchEmailsDirectly
  );

  router.get(
    "/accounts/:accountId/emails-direct/:messageId",
    // validateParams(emailAccountValidation.accountId),
    EmailAccountController.fetchEmailDirectly
  );

  router.get(
    "/accounts/:accountId/emails",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.getAccountEmailsWithThreads
  );
  router.get(
    "/accounts/:accountId/threads/:threadId",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.getThreadDetails
  );

  router.get(
    "/accounts/:accountId/debug",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.getAccountEmailCount
  );

  // Reset sync state for debugging
  router.post(
    "/accounts/:accountId/reset-sync",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.resetSyncState
  );

  router.post(
    "/accounts/:accountId/refresh-token",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.refreshAccountToken
  );

  // Re-authenticate existing account with expired tokens
  router.post(
    "/accounts/:accountId/re-authenticate",
    validateParams(emailAccountValidation.accountId),
    EmailAccountController.reAuthenticateExistingAccount
  );
};

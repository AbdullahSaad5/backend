import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { OutlookEmailService } from "../services/outlook-email.service";
import { UnifiedEmailService } from "../services/unified-email.service";
import { EmailThreadingService } from "../services/email-threading.service";

// Mock Microsoft Graph Client
jest.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: jest.fn(() => ({
      api: jest.fn(() => ({
        post: jest.fn(),
        get: jest.fn(),
      })),
    })),
  },
}));

// Mock EmailOAuthService
jest.mock("../services/emailOAuth.service", () => ({
  EmailOAuthService: {
    getDecryptedAccessToken: jest.fn(),
    refreshTokens: jest.fn(),
  },
}));

describe("Outlook Email Flow", () => {
  let mockEmailAccount: any;
  let mockGraphClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock email account
    mockEmailAccount = {
      _id: "outlook-account-123",
      emailAddress: "test@outlook.com",
      accountName: "Test Outlook Account",
      displayName: "Test User",
      oauth: {
        provider: "outlook",
        clientId: "test-client-id",
        clientSecret: "encrypted-secret",
        refreshToken: "encrypted-refresh-token",
        accessToken: "encrypted-access-token",
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
      },
    };

    // Mock Graph client
    mockGraphClient = {
      api: jest.fn(() => ({
        post: jest.fn(),
        get: jest.fn(),
      })),
    };
  });

  describe("OutlookEmailService", () => {
    it("should send email successfully via Microsoft Graph API", async () => {
      const mockResponse = { id: "msg-123", conversationId: "conv-456" };
      const mockApi = mockGraphClient.api("/me/sendMail");
      mockApi.post.mockResolvedValue(mockResponse);

      const message = {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
        htmlBody: "<p>This is a test email</p>",
      };

      const result = await OutlookEmailService.sendEmail(mockEmailAccount, message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
      expect(result.threadId).toBe("conv-456");
    });

    it("should send reply with proper threading headers", async () => {
      const mockOriginalMessage = {
        id: "original-msg-123",
        conversationId: "conv-456",
        subject: "Original Subject",
        references: ["ref-1", "ref-2"],
      };

      const mockReplyResponse = { id: "reply-msg-789" };

      // Mock getting original message
      const mockGetApi = mockGraphClient.api("/me/messages/original-msg-123");
      mockGetApi.get.mockResolvedValue(mockOriginalMessage);

      // Mock sending reply
      const mockSendApi = mockGraphClient.api("/me/sendMail");
      mockSendApi.post.mockResolvedValue(mockReplyResponse);

      const message = {
        to: "sender@example.com",
        subject: "Re: Original Subject",
        body: "This is a reply",
      };

      const result = await OutlookEmailService.sendReply(mockEmailAccount, "original-msg-123", message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("reply-msg-789");
      expect(result.threadId).toBe("conv-456");
    });

    it("should create draft successfully", async () => {
      const mockResponse = { id: "draft-123", conversationId: "conv-456" };
      const mockApi = mockGraphClient.api("/me/messages");
      mockApi.post.mockResolvedValue(mockResponse);

      const message = {
        to: "recipient@example.com",
        subject: "Draft Email",
        body: "This is a draft",
      };

      const result = await OutlookEmailService.createDraft(mockEmailAccount, message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("draft-123");
      expect(result.threadId).toBe("conv-456");
    });
  });

  describe("UnifiedEmailService", () => {
    it("should route Outlook accounts to Outlook service", async () => {
      const message = {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
      };

      // Mock OutlookEmailService.sendEmail
      const mockOutlookSend = jest.spyOn(OutlookEmailService, "sendEmail");
      mockOutlookSend.mockResolvedValue({
        success: true,
        messageId: "msg-123",
        threadId: "conv-456",
      });

      const result = await UnifiedEmailService.sendEmail(mockEmailAccount, message);

      expect(mockOutlookSend).toHaveBeenCalledWith(mockEmailAccount, message);
      expect(result.success).toBe(true);
      expect(result.provider).toBe("outlook");
    });

    it("should handle Outlook replies correctly", async () => {
      const message = {
        to: "sender@example.com",
        subject: "Re: Test",
        body: "This is a reply",
      };

      // Mock OutlookEmailService.sendReply
      const mockOutlookReply = jest.spyOn(OutlookEmailService, "sendReply");
      mockOutlookReply.mockResolvedValue({
        success: true,
        messageId: "reply-123",
        threadId: "conv-456",
      });

      const result = await UnifiedEmailService.sendReply(mockEmailAccount, "original-msg-123", message);

      expect(mockOutlookReply).toHaveBeenCalledWith(mockEmailAccount, "original-msg-123", message);
      expect(result.success).toBe(true);
      expect(result.provider).toBe("outlook");
    });

    it("should return correct account capabilities for Outlook", () => {
      const capabilities = UnifiedEmailService.getAccountCapabilities(mockEmailAccount);

      expect(capabilities.supportsGraphAPI).toBe(true);
      expect(capabilities.supportsDrafts).toBe(true);
      expect(capabilities.supportsThreading).toBe(true);
      expect(capabilities.provider).toBe("outlook");
    });
  });

  describe("EmailThreadingService", () => {
    it("should handle Outlook threading with conversationId", async () => {
      const mockEmail = {
        threadId: "conv-456",
        accountId: "outlook-account-123",
        subject: "Test Subject",
        from: { email: "sender@example.com" },
        references: ["ref-1", "ref-2"],
        inReplyTo: "msg-123",
      };

      // Mock EmailThreadModel.findOne
      const mockFindOne = jest.fn();
      const mockUpdateThread = jest.fn();

      jest.doMock("../models/email-thread.model", () => ({
        EmailThreadModel: {
          findOne: mockFindOne,
        },
      }));

      // Mock existing thread
      const mockExistingThread = {
        threadId: "conv-456",
        accountId: "outlook-account-123",
      };

      mockFindOne.mockResolvedValue(mockExistingThread);

      // Test the threading logic
      const result = await EmailThreadingService.findOrCreateOutlookThread(mockEmail);

      expect(result).toBe("conv-456");
    });

    it("should detect reply emails correctly", () => {
      const replySubjects = ["Re: Test Subject", "RE: Test Subject", "Re[1]: Test Subject", "Re (2): Test Subject"];

      replySubjects.forEach((subject) => {
        const isReply = (EmailThreadingService as any).isReplyEmail(subject);
        expect(isReply).toBe(true);
      });

      const nonReplySubjects = ["Test Subject", "New Email", "Important Message"];

      nonReplySubjects.forEach((subject) => {
        const isReply = (EmailThreadingService as any).isReplyEmail(subject);
        expect(isReply).toBe(false);
      });
    });

    it("should extract original subject from reply subjects", () => {
      const testCases = [
        { input: "Re: Test Subject", expected: "Test Subject" },
        { input: "RE: Important Message", expected: "Important Message" },
        { input: "Re[1]: Meeting Notes", expected: "Meeting Notes" },
        { input: "Re (2): Project Update", expected: "Project Update" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (EmailThreadingService as any).getOriginalSubject(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle token refresh failures gracefully", async () => {
      // Mock token refresh failure
      const mockRefreshTokens = jest.spyOn(
        require("../services/emailOAuth.service").EmailOAuthService,
        "refreshTokens"
      );
      mockRefreshTokens.mockResolvedValue({
        success: false,
        error: "Token refresh failed",
      });

      const message = {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
      };

      const result = await OutlookEmailService.sendEmail(mockEmailAccount, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get Outlook access token");
    });

    it("should handle Microsoft Graph API errors", async () => {
      // Mock Graph API error
      const mockApi = mockGraphClient.api("/me/sendMail");
      mockApi.post.mockRejectedValue(new Error("Graph API error"));

      const message = {
        to: "recipient@example.com",
        subject: "Test Email",
        body: "This is a test email",
      };

      const result = await OutlookEmailService.sendEmail(mockEmailAccount, message);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Graph API error");
    });
  });
});

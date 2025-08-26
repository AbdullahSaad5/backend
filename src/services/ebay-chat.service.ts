import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getStoredEbayAccessToken, getStoredEbayUserAccessToken } from "@/utils/ebay-helpers.util";
import {
  EbayChatSendMessageRequest,
  EbayChatGetMessagesRequest,
  EbayChatResponse,
  EbayChatMessage,
  EbayChatOrderInfo,
} from "@/contracts/ebay-chat.contract";

const type: any =
  process.env.EBAY_TOKEN_ENV === "production" || process.env.EBAY_TOKEN_ENV === "sandbox"
  ? process.env.EBAY_TOKEN_ENV
    : "production";

const baseURL = type === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
const tradingAPIURL = type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";

// Helper function to get legacy messages using Trading API
const getLegacyMessages = async (req: Request, res: Response, orderId: string, accessToken: string) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // Create XML request for GetMemberMessages
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<GetMemberMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnAll</DetailLevel>
  <EntriesPerPage>${limit}</EntriesPerPage>
  <PageNumber>${Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1}</PageNumber>
  <MessageStatus>Unanswered</MessageStatus>
</GetMemberMessagesRequest>`;

    const response = await fetch(tradingAPIURL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALL-NAME": "GetMemberMessages",
        "X-EBAY-API-VERSION": "1177",
        "X-EBAY-API-SITE-ID": "3", // UK site
      },
      body: xmlRequest,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ eBay Trading API error:", response.status, errorData);
      return res.status(response.status).json({
        success: false,
        error: `eBay Trading API error: ${response.status}`,
        details: errorData,
      });
    }

    const xmlData = await response.text();
    
    // Parse XML response (you might want to use a proper XML parser)
    const messages = parseLegacyMessagesXML(xmlData);

    return res.status(StatusCodes.OK).json({
      success: true,
      data: {
        messages: messages,
        total: messages.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        apiType: "legacy",
      },
    });
  } catch (error: any) {
    console.error("❌ Error getting legacy eBay messages:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to get legacy eBay messages",
      details: error.message,
    });
  }
};

// Helper function to send legacy message reply
const sendLegacyMessageReply = async (req: Request, res: Response, messageId: string, message: string, accessToken: string) => {
  try {
    // Create XML request for RespondToBestOffer
    const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<RespondToBestOfferRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${messageId}</ItemID>
  <Action>Accept</Action>
  <SellerResponse>${message}</SellerResponse>
</RespondToBestOfferRequest>`;

    const response = await fetch(tradingAPIURL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALL-NAME": "RespondToBestOffer",
        "X-EBAY-API-VERSION": "1177",
        "X-EBAY-API-SITE-ID": "3", // UK site
      },
      body: xmlRequest,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ eBay Trading API error sending reply:", response.status, errorData);
      return res.status(response.status).json({
        success: false,
        error: `eBay Trading API error: ${response.status}`,
        details: errorData,
      });
    }

    const xmlData = await response.text();
    
    return res.status(StatusCodes.CREATED).json({
      success: true,
      data: {
        messageId: messageId,
        message: message,
        timestamp: new Date().toISOString(),
        apiType: "legacy",
      },
    });
  } catch (error: any) {
    console.error("❌ Error sending legacy message reply:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: "Failed to send legacy message reply",
      details: error.message,
    });
  }
};

// Helper function to parse legacy XML messages
const parseLegacyMessagesXML = (xmlString: string): EbayChatMessage[] => {
  try {
    // Simple XML parsing (you might want to use a proper XML parser like xml2js)
    const messages: EbayChatMessage[] = [];
    
    // Extract MemberMessageExchange elements
    const memberMessageMatches = xmlString.match(/<MemberMessageExchange>([\s\S]*?)<\/MemberMessageExchange>/g);
    
    if (memberMessageMatches) {
      memberMessageMatches.forEach((match) => {
        // Extract basic message info
        const messageIdMatch = match.match(/<MessageID>(\d+)<\/MessageID>/);
        const senderMatch = match.match(/<SenderID>([^<]+)<\/SenderID>/);
        const recipientMatch = match.match(/<RecipientID>([^<]+)<\/RecipientID>/);
        const subjectMatch = match.match(/<Subject>([^<]+)<\/Subject>/);
        const bodyMatch = match.match(/<Body>([^<]+)<\/Body>/);
        const creationDateMatch = match.match(/<CreationDate>([^<]+)<\/CreationDate>/);
        const messageStatusMatch = match.match(/<MessageStatus>([^<]+)<\/MessageStatus>/);
        
        if (messageIdMatch && senderMatch && recipientMatch) {
          messages.push({
            messageId: messageIdMatch[1],
            orderId: "legacy", // Legacy API doesn't have orderId
            sender: {
              username: senderMatch[1],
              role: "BUYER", // In legacy API, sender is usually buyer
            },
            recipient: {
              username: recipientMatch[1],
              role: "SELLER", // In legacy API, recipient is usually seller
            },
            subject: subjectMatch ? subjectMatch[1] : "Legacy Message",
            message: bodyMatch ? bodyMatch[1] : "",
            timestamp: creationDateMatch ? creationDateMatch[1] : new Date().toISOString(),
            read: messageStatusMatch ? messageStatusMatch[1] === "Answered" : false,
          });
        }
      });
    }
    
    return messages;
  } catch (error) {
    console.error("❌ Error parsing legacy XML:", error);
    return [];
  }
};

export const EbayChatService = {
  // Get orders for chat functionality
  getOrders: async (req: Request, res: Response) => {
    try {
      console.log("📩 Getting eBay orders for chat...");

      const accessToken = await getStoredEbayUserAccessToken();
      const { limit = 50, offset = 0, filter = "creationdate:[2024-01-01T00:00:00.000Z..]" } = req.query;

      const response = await fetch(
        `${baseURL}/sell/fulfillment/v1/order?limit=${limit}&offset=${offset}&filter=${encodeURIComponent(filter as string)}`,
        {
        headers: {
          Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ eBay API error:", response.status, errorData);
        return res.status(response.status).json({
          success: false,
          error: `eBay API error: ${response.status}`,
          details: errorData,
        });
      }

      const data = await response.json();
      
      // Transform orders to include chat-relevant information
      const transformedOrders: EbayChatOrderInfo[] = data.orders?.map((order: any) => ({
        orderId: order.orderId,
        buyerUsername: order.buyer?.username || "Unknown",
        sellerUsername: order.sellerId || "Current Seller",
        orderStatus: order.orderStatus,
        creationDate: order.creationDate,
        lastModifiedDate: order.lastModifiedDate,
        total: order.pricingSummary?.total || { value: 0, currency: "USD" },
        lineItems: order.lineItems?.map((item: any) => ({
          itemId: item.itemId,
          title: item.title,
          quantity: item.quantity,
          price: item.total || { value: 0, currency: "USD" },
        })) || [],
      })) || [];

      return res.status(StatusCodes.OK).json({
        success: true,
        data: {
          orders: transformedOrders,
          total: data.total || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      console.error("❌ Error getting eBay orders:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to get eBay orders",
        details: error.message,
      });
    }
  },

    // Send a message to buyer/seller
  sendMessage: async (req: Request, res: Response) => {
    try {
      console.log("📩 Sending eBay message:", JSON.stringify(req.body, null, 2));
      
      const { orderId, message, subject = "Order Inquiry", recipientRole, messageId, useLegacyAPI = false }: EbayChatSendMessageRequest & { messageId?: string; useLegacyAPI?: boolean } = req.body;
      
      if (!message) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Missing required field: message",
        });
      }

      const accessToken = await getStoredEbayUserAccessToken();

      // If it's a legacy message reply
      if (useLegacyAPI && messageId) {
        return await sendLegacyMessageReply(req, res, messageId, message, accessToken);
      }

      // Modern REST API flow
      if (!orderId || !recipientRole) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Missing required fields: orderId, recipientRole",
        });
      }

      // First, get order details to ensure it exists and get buyer/seller info
      const orderResponse = await fetch(
        `${baseURL}/sell/fulfillment/v1/order/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!orderResponse.ok) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: "Order not found",
        });
      }

      const orderData = await orderResponse.json();
      
      // Prepare message payload for eBay Messaging API
      const messagePayload = {
        subject: subject,
        body: message,
        recipient: {
          username: recipientRole === "BUYER" ? orderData.buyer?.username : orderData.sellerId,
          role: recipientRole,
        },
        orderId: orderId,
      };

      const response = await fetch(
        `${baseURL}/sell/messaging/v1/order/${orderId}/send_message`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Content-Language": "en-US",
            "Accept-Language": "en-US",
          },
          body: JSON.stringify(messagePayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ eBay Messaging API error:", response.status, errorData);
        return res.status(response.status).json({
          success: false,
          error: `eBay Messaging API error: ${response.status}`,
          details: errorData,
        });
      }

      const data = await response.json();

      return res.status(StatusCodes.CREATED).json({
        success: true,
        data: {
          messageId: data.messageId,
          orderId: orderId,
          subject: subject,
          message: message,
          recipientRole: recipientRole,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("❌ Error sending eBay message:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to send eBay message",
        details: error.message,
      });
    }
  },

  // Get messages for a specific order
  getMessages: async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { limit = 50, offset = 0, useLegacyAPI = false } = req.query;
      
      console.log(`📩 Getting messages for order: ${orderId}`);

      if (!orderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Order ID is required",
        });
      }

      const accessToken = await getStoredEbayUserAccessToken();

      if (useLegacyAPI === "true") {
        // Use legacy Trading API for member messages
        return await getLegacyMessages(req, res, orderId, accessToken);
      }

      // Try modern REST API first
      try {
        const response = await fetch(
          `${baseURL}/sell/messaging/v1/order/${orderId}/messages?limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
              "Content-Type": "application/json",
              "Content-Language": "en-US",
              "Accept-Language": "en-US",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Transform messages to our format
          const transformedMessages: EbayChatMessage[] = data.messages?.map((msg: any) => ({
            messageId: msg.messageId,
            orderId: orderId,
            sender: {
              username: msg.sender?.username || "Unknown",
              role: msg.sender?.role || "SELLER",
            },
            recipient: {
              username: msg.recipient?.username || "Unknown",
              role: msg.recipient?.role || "BUYER",
            },
            subject: msg.subject || "Order Message",
            message: msg.body || "",
            timestamp: msg.timestamp || new Date().toISOString(),
            read: msg.read || false,
          })) || [];

          return res.status(StatusCodes.OK).json({
            success: true,
            data: {
              messages: transformedMessages,
              total: data.total || 0,
              limit: parseInt(limit as string),
              offset: parseInt(offset as string),
            },
          });
        }
      } catch (error) {
        console.log("⚠️ Modern REST API failed, trying legacy API...");
      }

      // Fallback to legacy Trading API
      return await getLegacyMessages(req, res, orderId, accessToken);
    } catch (error: any) {
      console.error("❌ Error getting eBay messages:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to get eBay messages",
        details: error.message,
      });
    }
  },

  // Get a specific order by ID
  getOrderById: async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      
      console.log(`📩 Getting order details: ${orderId}`);

      if (!orderId) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Order ID is required",
        });
      }

      const accessToken = await getStoredEbayUserAccessToken();

      const response = await fetch(
        `${baseURL}/sell/fulfillment/v1/order/${orderId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
              },
            }
          );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ eBay API error:", response.status, errorData);
        return res.status(response.status).json({
          success: false,
          error: `eBay API error: ${response.status}`,
          details: errorData,
        });
      }

      const orderData = await response.json();

      // Transform order to our format
      const transformedOrder: EbayChatOrderInfo = {
        orderId: orderData.orderId,
        buyerUsername: orderData.buyer?.username || "Unknown",
        sellerUsername: orderData.sellerId || "Current Seller",
        orderStatus: orderData.orderStatus,
        creationDate: orderData.creationDate,
        lastModifiedDate: orderData.lastModifiedDate,
        total: orderData.pricingSummary?.total || { value: 0, currency: "USD" },
        lineItems: orderData.lineItems?.map((item: any) => ({
          itemId: item.itemId,
          title: item.title,
          quantity: item.quantity,
          price: item.total || { value: 0, currency: "USD" },
        })) || [],
      };

      return res.status(StatusCodes.OK).json({
        success: true,
        data: transformedOrder,
      });
    } catch (error: any) {
      console.error("❌ Error getting eBay order:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: "Failed to get eBay order",
        details: error.message,
      });
    }
  },
};

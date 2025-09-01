import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ReasonPhrases } from "http-status-codes";
import { getEbayAuthURL } from "@/utils/ebay-helpers.util";
import { XMLParser } from "fast-xml-parser";

const type = process.env.EBAY_TOKEN_ENV === "production" ? "production" : "sandbox";
const ebayUrl = type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";

export const ebayChatService = {
  // Get all orders with chat conversations
  getOrderChats: async (req: Request, res: Response): Promise<any> => {
    try {
      const accessToken = process.env.EBAY_ACCESS_TOKEN;
      const limit = Number(req.query.limit) || 10;
      const page = Number(req.query.page) || 0;
      const offset = (Math.max(page, 1) - 1) * limit;

      // Use the Trading API URL (already defined at the top of the file)
      const tradingApiUrl = ebayUrl; // This uses the Trading API URL, not Fulfillment API
      const currentDate = Date.now();
      const startDate = currentDate - 30 * 24 * 60 * 60 * 1000; // 30 days ago to capture recent messages
      const endDate = currentDate;
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();

      if (!accessToken) {
        const authUrl = getEbayAuthURL(type);
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "eBay user authorization required",
          authUrl,
        });
      }

      console.log("🔍 Making eBay API request to:", tradingApiUrl);
      console.log("🔍 Request headers:", {
        "X-EBAY-API-SITEID": "3",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-CALL-NAME": "GetMyMessages",
        "X-EBAY-API-IAF-TOKEN": accessToken ? "present" : "missing",
        "Content-Type": "text/xml",
      });
      console.log("🔍 Request body:", `
        <?xml version="1.0" encoding="utf-8"?>
        <GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <StartTime>${formattedStartDate}</StartTime>
          <EndTime>${formattedEndDate}</EndTime>
          <DetailLevel>ReturnHeaders</DetailLevel>
          <FolderID>1</FolderID>
          <Pagination>
            <EntriesPerPage>${limit}</EntriesPerPage>
            <PageNumber>${page + 1}</PageNumber>
          </Pagination>
        </GetMyMessagesRequest>
      `);
      
      const response = await fetch(tradingApiUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetMyMessages",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml",
        },
        body: `
        <?xml version="1.0" encoding="utf-8"?>
        <GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <StartTime>${formattedStartDate}</StartTime>
          <EndTime>${formattedEndDate}</EndTime>
          <DetailLevel>ReturnHeaders</DetailLevel>
          <FolderID>1</FolderID>
          <Pagination>
            <EntriesPerPage>${limit}</EntriesPerPage>
            <PageNumber>${page + 1}</PageNumber>
          </Pagination>
        </GetMyMessagesRequest>
        `,
      });

      const rawResponse = await response.text();
      console.log("🔍 Raw eBay API Response:", rawResponse.substring(0, 1000));
      console.log("🔍 Response Status:", response.status);
      console.log("🔍 Response Headers:", Object.fromEntries(response.headers.entries()));
      
      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
      const jsonObj = parser.parse(rawResponse);
      console.log("🔍 Parsed JSON Object:", JSON.stringify(jsonObj, null, 2).substring(0, 2000));

      if (response.status === 401 || /invalid\s+iaf\s+token/i.test(rawResponse)) {
        const authUrl = getEbayAuthURL(type);
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "Invalid or expired eBay user token",
          authUrl,
          details: rawResponse,
        });
      }

      try {
        const errors = jsonObj?.GetMyMessagesResponse?.Errors;
        const errorList = Array.isArray(errors) ? errors : errors ? [errors] : [];
        const hasAuthError = errorList.some((e: any) => ["931", "932", 931, 932].includes(e?.ErrorCode));
        if (hasAuthError) {
          const authUrl = getEbayAuthURL(type);
          return res.status(StatusCodes.UNAUTHORIZED).json({
            status: StatusCodes.UNAUTHORIZED,
            message: "eBay user token hard expired or invalid. Please re-authorize using the provided URL.",
            authUrl,
            details: jsonObj,
          });
        }
      } catch {}

      // Transform the eBay response into the format expected by the frontend
      const conversations = [];
      
      console.log("🔍 Checking for messages in response...");
      console.log("🔍 jsonObj structure:", Object.keys(jsonObj || {}));
      console.log("🔍 GetMyMessagesResponse:", jsonObj?.GetMyMessagesResponse ? "exists" : "missing");
      console.log("🔍 Messages:", jsonObj?.GetMyMessagesResponse?.Messages ? "exists" : "missing");
      console.log("🔍 Message:", jsonObj?.GetMyMessagesResponse?.Messages?.Message ? "exists" : "missing");
      
      // Extract messages from the response and transform them into conversations
      if (jsonObj?.GetMyMessagesResponse?.Messages?.Message) {
        const messages = Array.isArray(jsonObj.GetMyMessagesResponse.Messages.Message) 
          ? jsonObj.GetMyMessagesResponse.Messages.Message 
          : [jsonObj.GetMyMessagesResponse.Messages.Message];
        
        console.log("🔍 Found messages:", messages.length);
        console.log("🔍 First message structure:", JSON.stringify(messages[0], null, 2).substring(0, 1000));
        
        // Group messages by ItemID and Sender (buyer)
        const messageGroups = new Map(); // Key: `${ItemID}_${Sender}`, Value: array of messages
        
        for (const msg of messages) {
          const key = `${msg.ItemID || 'unknown_item'}_${msg.Sender || 'unknown_buyer'}`;
          if (!messageGroups.has(key)) {
            messageGroups.set(key, []);
          }
          messageGroups.get(key).push(msg);
        }
        
        // Create conversations from grouped messages
        for (const [key, group] of messageGroups) {
          // Sort messages by CreationDate (oldest first)
          group.sort((a: any, b: any) => new Date(a.CreationDate).getTime() - new Date(b.CreationDate).getTime());
          const latestMsg = group[group.length - 1]; // Most recent message
          const unreadCount = group.filter((m: any) => !m.Read && m.Sender !== 'current_seller').length; // Unread buyer messages
          
          conversations.push({
            _id: key,
            ebayItemId: latestMsg.ItemID || 'unknown_item',
            orderId: latestMsg.OrderID || null, // Include if available
            buyerUsername: latestMsg.Sender || 'unknown_buyer',
            sellerUsername: 'current_seller', // Replace with actual seller username if available
            listingTitle: latestMsg.ItemTitle || 'Unknown Item',
            listingUrl: latestMsg.ItemID ? `https://www.ebay.com/itm/${latestMsg.ItemID}` : '',
            lastMessage: latestMsg.Subject || 'No subject',
            lastMessageAt: new Date(latestMsg.CreationDate || Date.now()),
            unreadCount,
            totalMessages: group.length,
            isArchived: false,
            createdAt: new Date(group[0].CreationDate || Date.now()),
            updatedAt: new Date(),
          });
        }
      } else {
        console.log("🔍 No messages found in response");
        console.log("�� Response structure:", JSON.stringify(jsonObj, null, 2).substring(0, 2000));
      }
      
      console.log("🔍 Total conversations created:", conversations.length);

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Conversations retrieved successfully",
        data: {
          conversations,
          total: conversations.length
        },
      });
    } catch (error: any) {
      console.error("Error fetching messages:", error.message);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to fetch conversations",
        error: error.message,
      });
    }
  },

  // Get chat messages for a specific order and buyer
  getOrderChatMessages: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: GETTING ORDER CHAT MESSAGES ===");

      // Handle both old format (orderId/itemId/buyerUsername) and new format (itemId/buyerUsername)
      const { orderId, itemId, buyerUsername } = req.params;
      const ebayItemId = itemId || req.params.itemId; // Support both parameter names

      if (!ebayItemId || !buyerUsername) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Missing required parameters: itemId, buyerUsername",
        });
      }

      const accessToken = process.env.EBAY_ACCESS_TOKEN;
      
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get messages for this item
      const allMessages = await ebayChatService.getMessagesFromEbay(accessToken, ebayItemId);

      // Filter messages for this specific buyer
      const messages = allMessages.filter((msg: any) => msg.buyerUsername === buyerUsername);

      // Sort messages by time (oldest first)
      messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Order chat messages retrieved successfully",
        data: messages, // Frontend expects data.data to be the messages array
      });
    } catch (error: any) {
      console.error("Error getting order chat messages:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to get order chat messages",
        error: error.message,
      });
    }
  },

  // Send message to buyer for a specific order
  sendOrderMessage: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: SENDING ORDER MESSAGE ===");

      // Handle both old format and new format from frontend
      const { orderId, itemId, buyerUsername, content, ebayItemId } = req.body;
      const finalItemId = ebayItemId || itemId; // Support both parameter names

      if (!finalItemId || !buyerUsername || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Missing required fields: itemId/ebayItemId, buyerUsername, content",
        });
      }

      const accessToken = process.env.EBAY_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Send message to eBay
      const success = await ebayChatService.sendMessageToEbay(accessToken, finalItemId, buyerUsername, content);

      if (!success) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Failed to send message to eBay",
        });
      }

      const message = {
        orderId: orderId || null,
        itemId: finalItemId,
        buyerUsername,
        sellerUsername: "current_seller",
        messageType: "SELLER_TO_BUYER",
        content,
        status: "SENT",
        sentAt: new Date(),
        isRead: false,
      };

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Message sent successfully",
        data: message, // Frontend expects data.data to be the message object
      });
    } catch (error: any) {
      console.error("Error sending order message:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to send message",
        error: error.message,
      });
    }
  },

  // Mark order chat as read
  markOrderChatAsRead: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: MARKING ORDER CHAT AS READ ===");

      // Handle both old format (orderId/itemId/buyerUsername) and new format (itemId/buyerUsername)
      const { orderId, itemId, buyerUsername } = req.params;
      const ebayItemId = itemId || req.params.itemId; // Support both parameter names

      if (!ebayItemId || !buyerUsername) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Missing required parameters: itemId, buyerUsername",
        });
      }

      // In a real implementation, you would mark messages as read in eBay
      // For now, we'll just return success
      console.log(`Marking order chat as read: Order ${orderId || 'N/A'}, Item ${ebayItemId}, Buyer ${buyerUsername}`);

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Order chat marked as read",
        data: {
          orderId: orderId || null,
          itemId: ebayItemId,
          buyerUsername,
          markedAsRead: true,
        },
      });
    } catch (error: any) {
      console.error("Error marking order chat as read:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to mark order chat as read",
        error: error.message,
      });
    }
  },

  // Get unread count for all orders
  getUnreadCount: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: GETTING UNREAD COUNT ===");

      const accessToken = process.env.EBAY_ACCESS_TOKEN;
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get all order chats
      const orders = await ebayChatService.getOrdersFromEbay();
      let totalUnread = 0;

      for (const order of orders) {
        if (order.OrderID && order.ItemArray) {
          for (const item of order.ItemArray) {
            if (item.ItemID) {
              const messages = await ebayChatService.getMessagesFromEbay(accessToken, item.ItemID);
              const unreadMessages = messages.filter(
                (msg: any) => !msg.isRead && msg.messageType === "BUYER_TO_SELLER"
              );
              totalUnread += unreadMessages.length;
            }
          }
        }
      }

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: "Unread count retrieved successfully",
        data: {
          unreadCount: totalUnread,
        },
      });
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: "Failed to get unread count",
        error: error.message,
      });
    }
  },

  // Helper method to get orders from eBay using Fulfillment API
  getOrdersFromEbay: async (): Promise<any[]> => {
    try {
      console.log("🔍 Getting orders from eBay using Fulfillment API...");

      // Use the same approach as the working ebayListingService.getOrders
      const accessToken = process.env.EBAY_ACCESS_TOKEN;
      if (!accessToken) {
        console.error("❌ No eBay user access token available");
        return [];
      }

      const limit = 50;
      const offset = 0;
      // Use the Trading API URL (already defined at the top of the file)
      const tradingApiUrl = ebayUrl; // This uses the Trading API URL

      const currentDate = Date.now();
      const startDate = currentDate - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      const endDate = currentDate;
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();

      const response = await fetch(tradingApiUrl, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetOrders",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml",
        },
        body: `
        <?xml version="1.0" encoding="utf-8"?>
        <GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <CreateTimeFrom>${formattedStartDate}</CreateTimeFrom>
          <CreateTimeTo>${formattedEndDate}</CreateTimeTo>
          <OrderRole>Seller</OrderRole>
          <OrderStatus>All</OrderStatus>
          <NumberOfDays>25</NumberOfDays>
        </GetOrdersRequest>
        `,
      });

      const responseText = await response.text();
      console.log("📄 Raw eBay response length:", responseText.length);

      if (!response.ok) {
        console.error("❌ eBay API request failed:", response.status, response.statusText);
        console.error("Response text:", responseText.substring(0, 500));
        return [];
      }

      // Parse XML response using XMLParser (like the working method)
      const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
      const jsonObj = parser.parse(responseText);
      console.log("📊 Parsed XML structure:", JSON.stringify(jsonObj, null, 2).substring(0, 1000));

      // Extract orders from the XML response
      const orders = jsonObj?.GetOrdersResponse?.OrderArray?.Order || [];
      console.log(`✅ Successfully extracted ${orders.length} orders from eBay response`);

      return orders;
    } catch (error) {
      console.error("❌ Error getting orders from eBay:", error);
      return [];
    }
  },

  // Helper method to get messages from eBay using Trading API
  getMessagesFromEbay: async (accessToken: string, itemId: string): Promise<any[]> => {
    try {
      const response = await fetch(`${ebayUrl}`, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetMemberMessages",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml",
        },
        body: `
        <?xml version="1.0" encoding="utf-8"?>
        <GetMemberMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <ItemID>${itemId}</ItemID>
          <MailMessageType>All</MailMessageType>
        </GetMemberMessagesRequest>
        `,
      });

      const responseText = await response.text();

      if (response.ok) {
        return ebayChatService.parseMessagesFromXml(responseText, itemId);
      } else {
        console.error("Failed to get messages from eBay:", responseText);
        return [];
      }
    } catch (error) {
      console.error("Error getting messages from eBay:", error);
      return [];
    }
  },

  // Helper method to send message to eBay
  sendMessageToEbay: async (
    accessToken: string,
    itemId: string,
    buyerUsername: string,
    content: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${ebayUrl}`, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "AddMemberMessage",
          "X-EBAY-API-IAF-TOKEN": accessToken,
          "Content-Type": "text/xml",
        },
        body: `
        <?xml version="1.0" encoding="utf-8"?>
        <AddMemberMessageRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <ItemID>${itemId}</ItemID>
          <MemberMessage>
            <Body>${content}</Body>
            <DisplayText>${content}</DisplayText>
            <MessageType>AskSellerQuestion</MessageType>
            <QuestionType>General</QuestionType>
            <RecipientID>${buyerUsername}</RecipientID>
            <Subject>Message from seller</Subject>
          </MemberMessage>
        </AddMemberMessageRequest>
        `,
      });

      const responseText = await response.text();

      if (response.ok) {
        console.log("Message sent successfully to eBay");
        return true;
      } else {
        console.error("Failed to send message to eBay:", responseText);
        return false;
      }
    } catch (error) {
      console.error("Error sending message to eBay:", error);
      return false;
    }
  },

  // Helper method to parse messages from XML
  parseMessagesFromXml: (xmlText: string, itemId: string): any[] => {
    const messages: any[] = [];

    // Extract message data from XML
    const messageMatches = xmlText.match(/<MemberMessage>(.*?)<\/MemberMessage>/gs);

    if (messageMatches) {
      for (const messageMatch of messageMatches) {
        const senderMatch = messageMatch.match(/<Sender>(.*?)<\/Sender>/);
        const recipientMatch = messageMatch.match(/<RecipientID>(.*?)<\/RecipientID>/);
        const bodyMatch = messageMatch.match(/<Body>(.*?)<\/Body>/);
        const timestampMatch = messageMatch.match(/<MessageTime>(.*?)<\/MessageTime>/);

        if (senderMatch && recipientMatch && bodyMatch) {
          const sender = senderMatch[1];
          const recipient = recipientMatch[1];
          const content = bodyMatch[1];
          const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

          // Determine message type based on sender/recipient
          const messageType = sender.includes("seller") ? "SELLER_TO_BUYER" : "BUYER_TO_SELLER";

          messages.push({
            itemId,
            buyerUsername: messageType === "BUYER_TO_SELLER" ? sender : recipient,
            sellerUsername: messageType === "SELLER_TO_BUYER" ? sender : recipient,
            messageType,
            content,
            status: "DELIVERED",
            sentAt: new Date(timestamp),
            isRead: false,
          });
        }
      }
    }

    return messages;
  },
};

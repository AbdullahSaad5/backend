import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ReasonPhrases } from "http-status-codes";
import {
  IEbayChat,
  IEbayConversation,
  IEbayChatService,
  EbayMessageType,
  EbayMessageStatus,
  IEbayApiMessage,
  IEbayApiConversation,
} from "@/contracts/ebay-chat.contract";
import { getStoredEbayUserAccessToken } from "@/utils/ebay-helpers.util";

const type = process.env.EBAY_TOKEN_ENV === "production" ? "production" : "sandbox";
const ebayUrl = type === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

export const EbayChatService = {
  // Core messaging functions - Direct eBay API calls
  sendMessage: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: SENDING MESSAGE TO EBAY ===");
      
      const { ebayItemId, buyerUsername, content, orderId, sellerUsername } = req.body;
      
      // Validate required fields
      if (!ebayItemId || !buyerUsername || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Missing required fields: ebayItemId, buyerUsername, content",
        });
      }

      const messageData: Partial<IEbayChat> = {
        ebayItemId,
        buyerUsername,
        content,
        orderId,
        sellerUsername: sellerUsername || "current_seller"
      };

      // Send message directly to eBay API
      const success = await EbayChatService.sendEbayMessage(messageData);
      
      if (!success) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          message: "Failed to send message to eBay",
        });
      }

      // Return the message data (not stored in DB)
      const message: IEbayChat = {
        ebayItemId: messageData.ebayItemId!,
        orderId: messageData.orderId,
        buyerUsername: messageData.buyerUsername!,
        sellerUsername: messageData.sellerUsername || "current_seller",
        messageType: EbayMessageType.SELLER_TO_BUYER,
        content: messageData.content!,
        status: EbayMessageStatus.SENT,
        sentAt: new Date(),
        isRead: false
      };

      console.log("=== EBAY CHAT: MESSAGE SENT SUCCESSFULLY TO EBAY ===");
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: message
      });
    } catch (error: any) {
      console.error("=== EBAY CHAT: ERROR SENDING MESSAGE ===", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to send message",
        details: error.message,
      });
    }
  },

  getMessages: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: GETTING MESSAGES FROM EBAY ===");
      
      const { ebayItemId, buyerUsername } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get messages directly from eBay API
      const messages = await EbayChatService.getMessagesFromEbay(accessToken, ebayItemId);
      
      // Filter by buyer if specified
      const filteredMessages = buyerUsername ? 
        messages.filter((msg: IEbayChat) => msg.buyerUsername === buyerUsername) : 
        messages;

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedMessages = filteredMessages.slice(startIndex, startIndex + limit);

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: {
          messages: paginatedMessages,
          total: filteredMessages.length,
          page,
          limit
        }
      });
    } catch (error: any) {
      console.error("Error getting messages from eBay:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get messages",
        details: error.message,
      });
    }
  },

  getConversations: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: GETTING CONVERSATIONS FROM EBAY ===");
      
      const sellerUsername = req.params.sellerUsername || "current_seller";
      
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get orders first to get item IDs
      const orders = await EbayChatService.getOrdersFromEbay(accessToken);
      const conversations: IEbayConversation[] = [];
      
      for (const order of orders) {
        if (order.OrderID && order.ItemArray) {
          for (const item of order.ItemArray) {
            if (item.ItemID) {
              // Get messages for this item
              const messages = await EbayChatService.getMessagesFromEbay(accessToken, item.ItemID);
              
              if (messages.length > 0) {
                // Group messages by buyer
                const buyerGroups = messages.reduce((groups: any, message: IEbayChat) => {
                  const buyer = message.buyerUsername;
                  if (!groups[buyer]) {
                    groups[buyer] = [];
                  }
                  groups[buyer].push(message);
                  return groups;
                }, {});

                // Create conversation for each buyer
                for (const [buyerUsername, buyerMessages] of Object.entries(buyerGroups)) {
                  const messages = buyerMessages as IEbayChat[];
                  const lastMessage = messages[messages.length - 1];
                  const unreadCount = messages.filter((msg: IEbayChat) => 
                    !msg.isRead && msg.messageType === EbayMessageType.BUYER_TO_SELLER
                  ).length;

                  conversations.push({
                    ebayItemId: item.ItemID,
                    orderId: order.OrderID,
                    buyerUsername,
                    sellerUsername,
                    itemTitle: item.Title || "Unknown Item",
                    itemPrice: item.TransactionPrice || 0,
                    lastMessage: lastMessage.content,
                    lastMessageAt: lastMessage.sentAt,
                    unreadCount,
                    totalMessages: messages.length
                  });
                }
              }
            }
          }
        }
      }

      // Sort by last message time
      conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: {
          conversations,
          total: conversations.length
        }
      });
    } catch (error: any) {
      console.error("Error getting conversations from eBay:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get conversations",
        details: error.message,
      });
    }
  },

  markAsRead: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: MARKING MESSAGE AS READ ===");
      
      const { messageId } = req.params;
      
      // Since we're not storing in DB, we'll just return success
      // In a real implementation, you might want to call eBay API to mark as read
      console.log("Message marked as read (no DB storage)");
      
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: { messageId, markedAsRead: true }
      });
    } catch (error: any) {
      console.error("Error marking message as read:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to mark message as read",
        details: error.message,
      });
    }
  },

  markConversationAsRead: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: MARKING CONVERSATION AS READ ===");
      
      const { ebayItemId, buyerUsername } = req.params;
      
      // Since we're not storing in DB, we'll just log
      console.log(`Conversation marked as read for item ${ebayItemId} and buyer ${buyerUsername} (no DB storage)`);
      
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: { ebayItemId, buyerUsername, markedAsRead: true }
      });
    } catch (error: any) {
      console.error("Error marking conversation as read:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to mark conversation as read",
        details: error.message,
      });
    }
  },

  // eBay API integration
  syncEbayMessages: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: SYNCING MESSAGES FROM EBAY ===");
      
      const sellerUsername = req.params.sellerUsername || "current_seller";
      
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get orders first to get item IDs
      const orders = await EbayChatService.getOrdersFromEbay(accessToken);
      console.log(`Found ${orders.length} orders from eBay`);
      
      for (const order of orders) {
        if (order.OrderID && order.ItemArray) {
          for (const item of order.ItemArray) {
            if (item.ItemID) {
              console.log(`Getting messages for item ${item.ItemID}`);
              // Get messages for this item (no storage, just API call)
              await EbayChatService.getMessagesFromEbay(accessToken, item.ItemID);
            }
          }
        }
      }

      console.log("=== EBAY CHAT: MESSAGE SYNC COMPLETED ===");
      
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: { 
          synced: true, 
          ordersProcessed: orders.length 
        }
      });
    } catch (error: any) {
      console.error("=== EBAY CHAT: ERROR SYNCING MESSAGES ===", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to sync messages",
        details: error.message,
      });
    }
  },

  sendEbayMessage: async (messageData: Partial<IEbayChat>): Promise<boolean> => {
    try {
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        throw new Error("No valid eBay access token available");
      }

      // Use eBay Trading API to send message
      const response = await fetch(`${ebayUrl}/ws/api.dll`, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3", // UK site ID
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
          <ItemID>${messageData.ebayItemId}</ItemID>
          <MemberMessage>
            <Body>${messageData.content}</Body>
            <DisplayText>${messageData.content}</DisplayText>
            <MessageType>AskSellerQuestion</MessageType>
            <QuestionType>General</QuestionType>
            <RecipientID>${messageData.buyerUsername}</RecipientID>
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

  // Utility functions
  getUnreadCount: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: GETTING UNREAD COUNT FROM EBAY ===");
      
      const sellerUsername = req.params.sellerUsername || "current_seller";
      
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get all conversations and count unread messages
      const conversations = await EbayChatService.getConversationsInternal(sellerUsername);
      const totalUnread = conversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0);
      
      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: { unreadCount: totalUnread }
      });
    } catch (error: any) {
      console.error("Error getting unread count:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to get unread count",
        details: error.message,
      });
    }
  },

  searchMessages: async (req: Request, res: Response): Promise<any> => {
    try {
      console.log("=== EBAY CHAT: SEARCHING MESSAGES FROM EBAY ===");
      
      const { query } = req.query;
      const sellerUsername = req.params.sellerUsername || "current_seller";
      
      if (!query || typeof query !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: "Search query is required",
        });
      }
      
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: "No valid eBay access token available",
        });
      }

      // Get all conversations and search through messages
      const conversations = await EbayChatService.getConversationsInternal(sellerUsername);
      const allMessages: IEbayChat[] = [];
      
      for (const conversation of conversations) {
        const messages = await EbayChatService.getMessagesInternal(conversation.ebayItemId, conversation.buyerUsername);
        allMessages.push(...messages);
      }

      // Filter messages by search query
      const filteredMessages = allMessages.filter(message => 
        message.content.toLowerCase().includes(query.toLowerCase())
      );

      return res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: ReasonPhrases.OK,
        data: { 
          messages: filteredMessages,
          total: filteredMessages.length,
          query
        }
      });
    } catch (error: any) {
      console.error("Error searching messages:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        error: "Failed to search messages",
        details: error.message,
      });
    }
  },

  updateConversation: async (
    ebayItemId: string,
    buyerUsername: string,
    sellerUsername: string,
    updateData: Partial<IEbayConversation>
  ): Promise<void> => {
    try {
      // Since we're not storing in DB, we'll just log
      console.log("Conversation update requested (no DB storage):", {
        ebayItemId,
        buyerUsername,
        sellerUsername,
        updateData
      });
    } catch (error) {
      console.error("Error updating conversation:", error);
      throw error;
    }
  },

  // Helper methods for eBay API integration
  getOrdersFromEbay: async (accessToken: string): Promise<any[]> => {
    try {
      const currentDate = Date.now();
      const startDate = currentDate - 25 * 24 * 60 * 60 * 1000; // 25 days ago
      const endDate = currentDate;
      const formattedStartDate = new Date(startDate).toISOString();
      const formattedEndDate = new Date(endDate).toISOString();

      const response = await fetch(`${ebayUrl}/ws/api.dll`, {
        method: "POST",
        headers: {
          "X-EBAY-API-SITEID": "3",
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
      
      if (response.ok) {
        // Parse XML response to get orders
        const orders = EbayChatService.parseOrdersFromXml(responseText);
        return orders;
      } else {
        console.error("Failed to get orders from eBay:", responseText);
        return [];
      }
    } catch (error) {
      console.error("Error getting orders from eBay:", error);
      return [];
    }
  },

  getMessagesFromEbay: async (accessToken: string, itemId: string): Promise<IEbayChat[]> => {
    try {
      // Get messages for this item using eBay API
      const response = await fetch(`${ebayUrl}/ws/api.dll`, {
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
        const messages = EbayChatService.parseMessagesFromXml(responseText, itemId);
        return messages;
      } else {
        console.error("Failed to get messages from eBay:", responseText);
        return [];
      }
    } catch (error) {
      console.error("Error getting messages from eBay:", error);
      return [];
    }
  },

  syncMessagesForItem: async (accessToken: string, itemId: string, orderId: string, sellerUsername: string): Promise<void> => {
    try {
      // Get messages for this item (no storage)
      await EbayChatService.getMessagesFromEbay(accessToken, itemId);
    } catch (error) {
      console.error("Error syncing messages for item:", error);
    }
  },

  parseOrdersFromXml: (xmlText: string): any[] => {
    // Simple XML parsing for orders
    // In a real implementation, you'd use a proper XML parser
    const orders: any[] = [];
    
    // Extract OrderID and ItemArray from XML
    const orderMatches = xmlText.match(/<OrderID>(.*?)<\/OrderID>/g);
    const itemMatches = xmlText.match(/<ItemID>(.*?)<\/ItemID>/g);
    const titleMatches = xmlText.match(/<ItemTitle>(.*?)<\/ItemTitle>/g);
    const priceMatches = xmlText.match(/<TransactionPrice>(.*?)<\/TransactionPrice>/g);
    
    if (orderMatches && itemMatches) {
      for (let i = 0; i < orderMatches.length; i++) {
        const orderId = orderMatches[i].replace(/<\/?OrderID>/g, '');
        const itemId = itemMatches[i] ? itemMatches[i].replace(/<\/?ItemID>/g, '') : '';
        const title = titleMatches && titleMatches[i] ? titleMatches[i].replace(/<\/?ItemTitle>/g, '') : 'Unknown Item';
        const price = priceMatches && priceMatches[i] ? parseFloat(priceMatches[i].replace(/<\/?TransactionPrice>/g, '')) : 0;
        
        orders.push({
          OrderID: orderId,
          ItemArray: [{ 
            ItemID: itemId,
            Title: title,
            TransactionPrice: price
          }]
        });
      }
    }
    
    return orders;
  },

  parseMessagesFromXml: (xmlText: string, itemId: string): IEbayChat[] => {
    // Simple XML parsing for messages
    // In a real implementation, you'd use a proper XML parser
    const messages: IEbayChat[] = [];
    
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
          const messageType = sender.includes('seller') ? EbayMessageType.SELLER_TO_BUYER : EbayMessageType.BUYER_TO_SELLER;
          
          messages.push({
            ebayItemId: itemId,
            buyerUsername: messageType === EbayMessageType.BUYER_TO_SELLER ? sender : recipient,
            sellerUsername: messageType === EbayMessageType.SELLER_TO_BUYER ? sender : recipient,
            messageType,
            content,
            status: EbayMessageStatus.DELIVERED,
            sentAt: new Date(timestamp),
            isRead: false
          });
        }
      }
    }
    
    return messages;
  },

  saveMessageFromEbay: async (message: IEbayApiMessage, itemId: string, orderId: string, sellerUsername: string): Promise<void> => {
    try {
      // Since we're not storing in DB, we'll just log
      console.log("Message from eBay received (no DB storage):", {
        message,
        itemId,
        orderId,
        sellerUsername
      });
    } catch (error) {
      console.error("Error processing message from eBay:", error);
    }
  },

  // Internal methods for use within the service
  getConversationsInternal: async (sellerUsername: string): Promise<IEbayConversation[]> => {
    try {
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        throw new Error("No valid eBay access token available");
      }

      // Get orders first to get item IDs
      const orders = await EbayChatService.getOrdersFromEbay(accessToken);
      const conversations: IEbayConversation[] = [];
      
      for (const order of orders) {
        if (order.OrderID && order.ItemArray) {
          for (const item of order.ItemArray) {
            if (item.ItemID) {
              // Get messages for this item
              const messages = await EbayChatService.getMessagesFromEbay(accessToken, item.ItemID);
              
              if (messages.length > 0) {
                // Group messages by buyer
                const buyerGroups = messages.reduce((groups: any, message: IEbayChat) => {
                  const buyer = message.buyerUsername;
                  if (!groups[buyer]) {
                    groups[buyer] = [];
                  }
                  groups[buyer].push(message);
                  return groups;
                }, {});

                // Create conversation for each buyer
                for (const [buyerUsername, buyerMessages] of Object.entries(buyerGroups)) {
                  const messages = buyerMessages as IEbayChat[];
                  const lastMessage = messages[messages.length - 1];
                  const unreadCount = messages.filter((msg: IEbayChat) => 
                    !msg.isRead && msg.messageType === EbayMessageType.BUYER_TO_SELLER
                  ).length;

                  conversations.push({
                    ebayItemId: item.ItemID,
                    orderId: order.OrderID,
                    buyerUsername,
                    sellerUsername,
                    itemTitle: item.Title || "Unknown Item",
                    itemPrice: item.TransactionPrice || 0,
                    lastMessage: lastMessage.content,
                    lastMessageAt: lastMessage.sentAt,
                    unreadCount,
                    totalMessages: messages.length
                  });
                }
              }
            }
          }
        }
      }

      // Sort by last message time
      conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      return conversations;
    } catch (error) {
      console.error("Error getting conversations from eBay:", error);
      throw error;
    }
  },

  getMessagesInternal: async (ebayItemId: string, buyerUsername: string, page: number = 1, limit: number = 50): Promise<IEbayChat[]> => {
    try {
      const accessToken = await getStoredEbayUserAccessToken();
      if (!accessToken) {
        throw new Error("No valid eBay access token available");
      }

      // Get messages directly from eBay API
      const messages = await EbayChatService.getMessagesFromEbay(accessToken, ebayItemId);
      
      // Filter by buyer if specified
      const filteredMessages = buyerUsername ? 
        messages.filter((msg: IEbayChat) => msg.buyerUsername === buyerUsername) : 
        messages;

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedMessages = filteredMessages.slice(startIndex, startIndex + limit);

      return paginatedMessages;
    } catch (error) {
      console.error("Error getting messages from eBay:", error);
      throw error;
    }
  }
};

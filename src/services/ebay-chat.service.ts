import { EbayChatModel, EbayConversationModel } from "@/models/ebay-chat.model";
import {
  IEbayChat,
  IEbayConversation,
  IEbayChatService,
  EbayMessageType,
  EbayMessageStatus,
} from "@/contracts/ebay-chat.contract";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";

const type =
  process.env.EBAY_TOKEN_ENV === "production" || process.env.EBAY_TOKEN_ENV === "sandbox"
    ? process.env.EBAY_TOKEN_ENV
    : "production";
const ebayRestUrl = type === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";

export const EbayChatService: IEbayChatService = {
  // Core messaging functions
  sendMessage: async (messageData: Partial<IEbayChat>): Promise<IEbayChat> => {
    try {
      console.log("=== EBAY CHAT SERVICE SEND MESSAGE ===");
      console.log("Message data received:", messageData);

      const message = new EbayChatModel(messageData);
      const savedMessage = await message.save();

      // Update conversation
      await EbayChatService.updateConversation(
        messageData.ebayItemId!,
        messageData.buyerUsername!,
        messageData.sellerUsername!,
        {
          lastMessage: messageData.content,
          lastMessageAt: new Date(),
          unreadCount: messageData.messageType === EbayMessageType.BUYER_TO_SELLER ? 1 : 0,
        }
      );

      // If this is a seller message, send it to eBay
      if (messageData.messageType === EbayMessageType.SELLER_TO_BUYER) {
        await EbayChatService.sendEbayMessage(messageData);
      }

      console.log("=== EBAY CHAT SERVICE SEND MESSAGE COMPLETED ===");
      return savedMessage;
    } catch (error) {
      console.error("=== EBAY CHAT SERVICE SEND MESSAGE ERROR ===");
      console.error("Error saving message:", error);
      throw error;
    }
  },

  getMessages: async (
    ebayItemId: string,
    buyerUsername: string,
    page: number = 1,
    limit: number = 50
  ): Promise<IEbayChat[]> => {
    const skip = (page - 1) * limit;

    return EbayChatModel.find({
      ebayItemId,
      buyerUsername,
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
  },

  getConversations: async (sellerUsername: string): Promise<IEbayConversation[]> => {
    return EbayConversationModel.find({
      sellerUsername,
    })
      .sort({ lastMessageAt: -1 })
      .exec();
  },

  markAsRead: async (messageId: string): Promise<IEbayChat | null> => {
    return EbayChatModel.findByIdAndUpdate(
      messageId,
      {
        status: EbayMessageStatus.READ,
        readAt: new Date(),
      },
      { new: true }
    );
  },

  markConversationAsRead: async (ebayItemId: string, buyerUsername: string): Promise<void> => {
    // Mark all messages in conversation as read
    await EbayChatModel.updateMany(
      {
        ebayItemId,
        buyerUsername,
        status: { $ne: EbayMessageStatus.READ },
      },
      {
        status: EbayMessageStatus.READ,
        readAt: new Date(),
      }
    );

    // Reset unread count in conversation
    await EbayConversationModel.findOneAndUpdate({ ebayItemId, buyerUsername }, { unreadCount: 0 });
  },

  // eBay REST API integration
  syncEbayMessages: async (sellerUsername: string): Promise<void> => {
    try {
      console.log("=== SYNCING EBAY MESSAGES ===");

      const conversations = await EbayChatService.getEbayConversationsFromAPI();

      for (const conversation of conversations) {
        const messages = await EbayChatService.getEbayMessagesFromAPI(conversation.conversationId);

        for (const message of messages) {
          // Check if message already exists
          const existingMessage = await EbayChatModel.findOne({
            ebayMessageId: message.messageId,
          });

          if (!existingMessage) {
            // Create new message
            const newMessage = new EbayChatModel({
              ebayItemId: message.itemId,
              buyerUsername: message.senderId,
              sellerUsername: sellerUsername,
              messageType: EbayMessageType.BUYER_TO_SELLER,
              content: message.body,
              ebayMessageId: message.messageId,
              ebayTimestamp: new Date(message.timestamp),
              status: EbayMessageStatus.DELIVERED,
              metadata: {
                listingTitle: message.itemTitle,
                listingUrl: message.itemUrl,
                conversationId: conversation.conversationId,
              },
            });

            await newMessage.save();

            // Update conversation
            await EbayChatService.updateConversation(message.itemId, message.senderId, sellerUsername, {
              lastMessage: message.body,
              lastMessageAt: new Date(message.timestamp),
              unreadCount: 1,
              listingTitle: message.itemTitle,
              listingUrl: message.itemUrl,
            });
          }
        }
      }

      console.log("=== EBAY MESSAGES SYNCED ===");
    } catch (error) {
      console.error("Error syncing eBay messages:", error);
      throw error;
    }
  },

  sendEbayMessage: async (messageData: Partial<IEbayChat>): Promise<boolean> => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      // First, get or create conversation
      const conversationId = await EbayChatService.getOrCreateConversation(
        messageData.ebayItemId!,
        messageData.buyerUsername!
      );

      const requestBody = {
        message: {
          body: messageData.content,
          subject: messageData.subject || "Message from seller",
        },
      };

      const response = await fetch(`${ebayRestUrl}/sell/messaging/v1/order/${messageData.ebayItemId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("eBay REST API Response:", result);
        return true;
      } else {
        const errorText = await response.text();
        console.error("eBay REST API Error:", response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error("Error sending message to eBay:", error);
      return false;
    }
  },

  getEbayMessagesFromAPI: async (conversationId: string): Promise<any[]> => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const response = await fetch(`${ebayRestUrl}/sell/messaging/v1/conversation/${conversationId}/messages`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.messages || [];
      } else {
        console.error("eBay REST API Error:", response.status, await response.text());
        return [];
      }
    } catch (error) {
      console.error("Error fetching messages from eBay REST API:", error);
      return [];
    }
  },

  getEbayConversationsFromAPI: async (): Promise<any[]> => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      const response = await fetch(`${ebayRestUrl}/sell/messaging/v1/conversation`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.conversations || [];
      } else {
        console.error("eBay REST API Error:", response.status, await response.text());
        return [];
      }
    } catch (error) {
      console.error("Error fetching conversations from eBay REST API:", error);
      return [];
    }
  },

  getOrCreateConversation: async (ebayItemId: string, buyerUsername: string): Promise<string> => {
    try {
      const token = await getStoredEbayAccessToken();
      if (!token) {
        throw new Error("Missing or invalid eBay access token");
      }

      // Try to get existing conversation
      const response = await fetch(`${ebayRestUrl}/sell/messaging/v1/conversation?orderId=${ebayItemId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.conversations && result.conversations.length > 0) {
          return result.conversations[0].conversationId;
        }
      }

      // If no conversation exists, create one
      const createResponse = await fetch(`${ebayRestUrl}/sell/messaging/v1/conversation`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: ebayItemId,
          recipientId: buyerUsername,
        }),
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        return result.conversationId;
      } else {
        throw new Error("Failed to create conversation");
      }
    } catch (error) {
      console.error("Error getting or creating conversation:", error);
      throw error;
    }
  },

  // Conversation management
  getConversation: async (ebayItemId: string, buyerUsername: string): Promise<IEbayConversation | null> => {
    return EbayConversationModel.findOne({
      ebayItemId,
      buyerUsername,
    });
  },

  // Search and filtering
  searchMessages: async (query: string, sellerUsername: string): Promise<IEbayChat[]> => {
    return EbayChatModel.find({
      $and: [{ sellerUsername }, { $text: { $search: query } }],
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(50)
      .exec();
  },

  getUnreadCount: async (sellerUsername: string): Promise<number> => {
    const result = await EbayConversationModel.aggregate([
      {
        $match: {
          sellerUsername,
        },
      },
      {
        $group: {
          _id: null,
          totalUnread: { $sum: "$unreadCount" },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalUnread : 0;
  },

  // Helper method to update conversation
  updateConversation: async (
    ebayItemId: string,
    buyerUsername: string,
    sellerUsername: string,
    updates: any
  ): Promise<void> => {
    await EbayConversationModel.findOneAndUpdate(
      { ebayItemId, buyerUsername },
      {
        $set: {
          sellerUsername,
          ...updates,
        },
        $inc: { totalMessages: 1 },
      },
      { upsert: true }
    );
  },

  // Buyer management
  getBuyerList: async (sellerUsername: string): Promise<any[]> => {
    try {
      console.log("=== GETTING BUYER LIST ===");
      console.log("Seller username:", sellerUsername);

      // Get all conversations for this seller
      const conversations = await EbayConversationModel.find({
        sellerUsername,
      }).sort({ lastMessageAt: -1 }).exec();

      console.log("Found conversations:", conversations.length);

      // Create a map to store unique buyers with their details
      const buyerMap = new Map();

      conversations.forEach(conv => {
        if (!buyerMap.has(conv.buyerUsername)) {
          buyerMap.set(conv.buyerUsername, {
            username: conv.buyerUsername,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
            unreadCount: conv.unreadCount,
            totalConversations: 1,
            lastItemId: conv.ebayItemId,
            lastItemTitle: conv.listingTitle
          });
        } else {
          const existing = buyerMap.get(conv.buyerUsername);
          existing.totalConversations += 1;
          existing.unreadCount += conv.unreadCount;
          
          // Update with most recent conversation
          if (conv.lastMessageAt > existing.lastMessageAt) {
            existing.lastMessage = conv.lastMessage;
            existing.lastMessageAt = conv.lastMessageAt;
            existing.lastItemId = conv.ebayItemId;
            existing.lastItemTitle = conv.listingTitle;
          }
        }
      });

      const buyers = Array.from(buyerMap.values());
      
      console.log("Unique buyers found:", buyers.length);
      console.log("=== BUYER LIST COMPLETED ===");
      
      return buyers;
    } catch (error) {
      console.error("Error getting buyer list:", error);
      throw error;
    }
  },
};

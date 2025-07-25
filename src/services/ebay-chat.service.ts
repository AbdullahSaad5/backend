import { EbayChatModel, EbayConversationModel } from "@/models/ebay-chat.model";
import {
    IEbayChat,
    IEbayConversation,
    IEbayChatService,
    EbayMessageType,
    EbayMessageStatus
} from "@/contracts/ebay-chat.contract";
import { getStoredEbayAccessToken } from "@/utils/ebay-helpers.util";
import { XMLParser } from "fast-xml-parser";

const type = process.env.TYPE === "production" || process.env.TYPE === "sandbox" ? process.env.TYPE : "production";
const ebayUrl = type === "production" ? "https://api.ebay.com/ws/api.dll" : "https://api.sandbox.ebay.com/ws/api.dll";

export const EbayChatService: IEbayChatService = {
    // Core messaging functions
    sendMessage: async (messageData: Partial<IEbayChat>): Promise<IEbayChat> => {
        try {
            console.log('=== EBAY CHAT SERVICE SEND MESSAGE ===');
            console.log('Message data received:', messageData);

            const message = new EbayChatModel(messageData);
            const savedMessage = await message.save();

            // Update conversation
            await EbayChatService.updateConversation(messageData.ebayItemId!, messageData.buyerUsername!, messageData.sellerUsername!, {
                lastMessage: messageData.content,
                lastMessageAt: new Date(),
                unreadCount: messageData.messageType === EbayMessageType.BUYER_TO_SELLER ? 1 : 0
            });

            // If this is a seller message, send it to eBay
            if (messageData.messageType === EbayMessageType.SELLER_TO_BUYER) {
                await EbayChatService.sendEbayMessage(messageData);
            }

            console.log('=== EBAY CHAT SERVICE SEND MESSAGE COMPLETED ===');
            return savedMessage;
        } catch (error) {
            console.error('=== EBAY CHAT SERVICE SEND MESSAGE ERROR ===');
            console.error('Error saving message:', error);
            throw error;
        }
    },

    getMessages: async (ebayItemId: string, buyerUsername: string, page: number = 1, limit: number = 50): Promise<IEbayChat[]> => {
        const skip = (page - 1) * limit;

        return EbayChatModel.find({
            ebayItemId,
            buyerUsername
        })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit)
            .exec();
    },

    getConversations: async (sellerUsername: string): Promise<IEbayConversation[]> => {
        return EbayConversationModel.find({
            sellerUsername
        })
            .sort({ lastMessageAt: -1 })
            .exec();
    },

    markAsRead: async (messageId: string): Promise<IEbayChat | null> => {
        return EbayChatModel.findByIdAndUpdate(
            messageId,
            {
                status: EbayMessageStatus.READ,
                readAt: new Date()
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
                status: { $ne: EbayMessageStatus.READ }
            },
            {
                status: EbayMessageStatus.READ,
                readAt: new Date()
            }
        );

        // Reset unread count in conversation
        await EbayConversationModel.findOneAndUpdate(
            { ebayItemId, buyerUsername },
            { unreadCount: 0 }
        );
    },

    // eBay API integration
    syncEbayMessages: async (sellerUsername: string): Promise<void> => {
        try {
            console.log('=== SYNCING EBAY MESSAGES ===');

            const messages = await EbayChatService.getEbayMessagesFromAPI(sellerUsername, 30);

            for (const message of messages) {
                // Check if message already exists
                const existingMessage = await EbayChatModel.findOne({
                    ebayMessageId: message.messageId
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
                            listingUrl: message.itemUrl
                        }
                    });

                    await newMessage.save();

                    // Update conversation
                    await EbayChatService.updateConversation(
                        message.itemId,
                        message.senderId,
                        sellerUsername,
                        {
                            lastMessage: message.body,
                            lastMessageAt: new Date(message.timestamp),
                            unreadCount: 1,
                            listingTitle: message.itemTitle,
                            listingUrl: message.itemUrl
                        }
                    );
                }
            }

            console.log('=== EBAY MESSAGES SYNCED ===');
        } catch (error) {
            console.error('Error syncing eBay messages:', error);
            throw error;
        }
    },

    sendEbayMessage: async (messageData: Partial<IEbayChat>): Promise<boolean> => {
        try {
            const token = await getStoredEbayAccessToken();
            if (!token) {
                throw new Error("Missing or invalid eBay access token");
            }

            const requestBody = `
        <?xml version="1.0" encoding="utf-8"?>
        <SendMessageToUserRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <ItemID>${messageData.ebayItemId}</ItemID>
          <RecipientID>${messageData.buyerUsername}</RecipientID>
          <Subject>${messageData.subject || 'Message from seller'}</Subject>
          <Body>${messageData.content}</Body>
        </SendMessageToUserRequest>
      `;

            const response = await fetch(ebayUrl, {
                method: "POST",
                headers: {
                    "X-EBAY-API-SITEID": "3", // UK site ID
                    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
                    "X-EBAY-API-CALL-NAME": "SendMessageToUser",
                    "X-EBAY-API-IAF-TOKEN": token,
                    "Content-Type": "text/xml",
                },
                body: requestBody,
            });

            const responseText = await response.text();
            const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
            const result = parser.parse(responseText);

            if (result.SendMessageToUserResponse?.Ack === "Success") {
                return true;
            } else {
                console.error('eBay API Error:', result);
                return false;
            }
        } catch (error) {
            console.error('Error sending message to eBay:', error);
            return false;
        }
    },

    getEbayMessagesFromAPI: async (sellerUsername: string, days: number = 30): Promise<any[]> => {
        try {
            const token = await getStoredEbayAccessToken();
            if (!token) {
                throw new Error("Missing or invalid eBay access token");
            }

            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const requestBody = `
        <?xml version="1.0" encoding="utf-8"?>
        <GetMyMessagesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
          <ErrorLanguage>en_US</ErrorLanguage>
          <WarningLevel>High</WarningLevel>
          <StartTimeFrom>${startDate.toISOString()}</StartTimeFrom>
          <StartTimeTo>${endDate.toISOString()}</StartTimeTo>
          <DetailLevel>ReturnAll</DetailLevel>
        </GetMyMessagesRequest>
      `;

            const response = await fetch(ebayUrl, {
                method: "POST",
                headers: {
                    "X-EBAY-API-SITEID": "3", // UK site ID
                    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
                    "X-EBAY-API-CALL-NAME": "GetMyMessages",
                    "X-EBAY-API-IAF-TOKEN": token,
                    "Content-Type": "text/xml",
                },
                body: requestBody,
            });

            const responseText = await response.text();
            const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
            const result = parser.parse(responseText);

            if (result.GetMyMessagesResponse?.Ack === "Success") {
                const messages = result.GetMyMessagesResponse?.Messages?.Message || [];
                return Array.isArray(messages) ? messages : [messages];
            } else {
                console.error('eBay API Error:', result);
                return [];
            }
        } catch (error) {
            console.error('Error fetching messages from eBay API:', error);
            return [];
        }
    },

    // Conversation management
    getConversation: async (ebayItemId: string, buyerUsername: string): Promise<IEbayConversation | null> => {
        return EbayConversationModel.findOne({
            ebayItemId,
            buyerUsername
        });
    },



    // Search and filtering
    searchMessages: async (query: string, sellerUsername: string): Promise<IEbayChat[]> => {
        return EbayChatModel.find({
            $and: [
                { sellerUsername },
                { $text: { $search: query } }
            ]
        })
            .sort({ score: { $meta: "textScore" } })
            .limit(50)
            .exec();
    },

    getUnreadCount: async (sellerUsername: string): Promise<number> => {
        const result = await EbayConversationModel.aggregate([
            {
                $match: {
                    sellerUsername
                }
            },
            {
                $group: {
                    _id: null,
                    totalUnread: { $sum: "$unreadCount" }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalUnread : 0;
    },

    // Helper method to update conversation
    updateConversation: async (ebayItemId: string, buyerUsername: string, sellerUsername: string, updates: any): Promise<void> => {
        await EbayConversationModel.findOneAndUpdate(
            { ebayItemId, buyerUsername },
            {
                $set: {
                    sellerUsername,
                    ...updates
                },
                $inc: { totalMessages: 1 }
            },
            { upsert: true }
        );
    }
}; 
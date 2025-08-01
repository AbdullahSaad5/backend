import { EbayChatModel, EbayConversationModel } from "@/models/ebay-chat.model";
import {
    IEbayChat,
    IEbayConversation,
    IEbayChatService,
    EbayMessageType,
    EbayMessageStatus
} from "@/contracts/ebay-chat.contract";

// Mock data for sandbox testing
const MOCK_BUYERS = [
    { username: "test_buyer_1", name: "John Smith" },
    { username: "test_buyer_2", name: "Sarah Johnson" },
    { username: "test_buyer_3", name: "Mike Wilson" },
    { username: "test_buyer_4", name: "Lisa Brown" },
    { username: "test_buyer_5", name: "David Lee" }
];

const MOCK_LISTINGS = [
    { itemId: "123456789", title: "iPhone 14 Pro", price: "$999.99" },
    { itemId: "987654321", title: "Samsung Galaxy", price: "$1199.99" },
    { itemId: "456789123", title: "MacBook Pro 14-inch", price: "$1999.99" },
    { itemId: "789123456", title: "Sony WH-1000XM5 ", price: "$399.99" },
    { itemId: "321654987", title: "Nintendo Switch", price: "$349.99" }
];

const MOCK_MESSAGES = [
    "Hi, is this item still available?",
    "What's the best price you offer?",
    "Do you ship internationally?",
    "I see more photos of the item?",
    "Is there any warranty included?",
    "How long does shipping take?",
    "Do you accept returns?",
    "Can you combine shipping ",
    "Is this the latest model?",
    "What payment methods do you accept?"
];

export const EbayChatSandboxService: IEbayChatService = {
    // Core messaging functions
    sendMessage: async (messageData: Partial<IEbayChat>): Promise<IEbayChat> => {
        try {
            console.log('=== SANDBOX: SENDING MESSAGE ===');
            console.log('Message data:', messageData);

            const message = new EbayChatModel({
                ...messageData,
                status: EbayMessageStatus.SENT,
                sentAt: new Date()
            });
            const savedMessage = await message.save();

            // Update conversation
            await EbayChatSandboxService.updateConversation(
                messageData.ebayItemId!,
                messageData.buyerUsername!,
                messageData.sellerUsername!,
                {
                    lastMessage: messageData.content,
                    lastMessageAt: new Date(),
                    unreadCount: messageData.messageType === EbayMessageType.BUYER_TO_SELLER ? 1 : 0
                }
            );

            // Simulate eBay API response delay
            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('=== SANDBOX: MESSAGE SENT SUCCESSFULLY ===');
            return savedMessage;
        } catch (error) {
            console.error('=== SANDBOX: ERROR SENDING MESSAGE ===', error);
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

        await EbayConversationModel.findOneAndUpdate(
            { ebayItemId, buyerUsername },
            { unreadCount: 0 }
        );
    },

    // Sandbox-specific functions
    syncEbayMessages: async (sellerUsername: string): Promise<void> => {
        try {
            console.log('=== SANDBOX: SYNCING MOCK MESSAGES ===');

            // Generate random mock messages
            const mockMessages = await EbayChatSandboxService.generateMockMessages!(sellerUsername);

            for (const message of mockMessages) {
                const existingMessage = await EbayChatModel.findOne({
                    ebayMessageId: message.ebayMessageId
                });

                if (!existingMessage) {
                    const newMessage = new EbayChatModel(message);
                    await newMessage.save();

                    await EbayChatSandboxService.updateConversation(
                        message.ebayItemId!,
                        message.buyerUsername!,
                        message.sellerUsername!,
                        {
                            lastMessage: message.content,
                            lastMessageAt: message.ebayTimestamp,
                            unreadCount: 1,
                            listingTitle: message.metadata?.listingTitle,
                            listingUrl: message.metadata?.listingUrl
                        }
                    );
                }
            }

            console.log(`=== SANDBOX: SYNCED ${mockMessages.length} MOCK MESSAGES ===`);
        } catch (error) {
            console.error('Error syncing sandbox messages:', error);
            throw error;
        }
    },

    sendEbayMessage: async (messageData: Partial<IEbayChat>): Promise<boolean> => {
        try {
            console.log('=== SANDBOX: SIMULATING EBAY MESSAGE SEND ===');

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate 95% success rate
            const success = Math.random() > 0.05;

            if (success) {
                console.log('=== SANDBOX: MESSAGE SENT TO EBAY SUCCESSFULLY ===');
                return true;
            } else {
                console.log('=== SANDBOX: SIMULATED EBAY API ERROR ===');
                return false;
            }
        } catch (error) {
            console.error('Error in sandbox message send:', error);
            return false;
        }
    },

    getEbayMessagesFromAPI: async (conversationId: string): Promise<any[]> => {
        console.log('=== SANDBOX: GENERATING MOCK EBAY MESSAGES FOR CONVERSATION ===', conversationId);

        const mockMessages = await EbayChatSandboxService.generateMockMessages!('sandbox_user');
        return mockMessages.map((msg: any) => ({
            messageId: msg.ebayMessageId,
            itemId: msg.ebayItemId,
            senderId: msg.buyerUsername,
            body: msg.content,
            timestamp: msg.ebayTimestamp,
            itemTitle: msg.metadata?.listingTitle,
            itemUrl: msg.metadata?.listingUrl
        }));
    },

    getEbayConversationsFromAPI: async (): Promise<any[]> => {
        console.log('=== SANDBOX: GENERATING MOCK EBAY CONVERSATIONS ===');

        const mockConversations = [];
        for (let i = 0; i < 5; i++) {
            const listing = MOCK_LISTINGS[i % MOCK_LISTINGS.length];
            const buyer = MOCK_BUYERS[i % MOCK_BUYERS.length];
            
            mockConversations.push({
                conversationId: `conv_${listing.itemId}_${buyer.username}`,
                orderId: listing.itemId,
                recipientId: buyer.username,
                lastMessage: MOCK_MESSAGES[i % MOCK_MESSAGES.length],
                lastMessageAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
                unreadCount: Math.floor(Math.random() * 5),
                itemTitle: listing.title
            });
        }

        return mockConversations;
    },

    getOrCreateConversation: async (ebayItemId: string, buyerUsername: string): Promise<string> => {
        console.log('=== SANDBOX: GETTING OR CREATING CONVERSATION ===', { ebayItemId, buyerUsername });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return a mock conversation ID
        return `conv_${ebayItemId}_${buyerUsername}`;
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

    // Helper methods
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
    },

    // Sandbox-specific helper methods
    generateMockMessages: async (sellerUsername: string): Promise<Partial<IEbayChat>[]> => {
        const messages: Partial<IEbayChat>[] = [];
        const numMessages = Math.floor(Math.random() * 5) + 1; // 1-5 messages

        for (let i = 0; i < numMessages; i++) {
            const buyer = MOCK_BUYERS[Math.floor(Math.random() * MOCK_BUYERS.length)];
            const listing = MOCK_LISTINGS[Math.floor(Math.random() * MOCK_LISTINGS.length)];
            const messageText = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];

            // Random timestamp within last 7 days
            const timestamp = new Date();
            timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 7));

            messages.push({
                ebayItemId: listing.itemId,
                buyerUsername: buyer.username,
                sellerUsername: sellerUsername,
                messageType: EbayMessageType.BUYER_TO_SELLER,
                content: messageText,
                ebayMessageId: `mock_${Date.now()}_${i}`,
                ebayTimestamp: timestamp,
                status: EbayMessageStatus.DELIVERED,
                metadata: {
                    listingTitle: listing.title,
                    listingUrl: `https://sandbox.ebay.com/itm/${listing.itemId}`
                }
            });
        }

        return messages;
    },

    // Initialize sandbox with sample data
    initializeSandboxData: async (sellerUsername: string): Promise<void> => {
        try {
            console.log('=== SANDBOX: INITIALIZING SAMPLE DATA ===');
            console.log('Seller username:', sellerUsername);

            // Clear existing data first to avoid conflicts
            console.log('Clearing existing sandbox data...');
            await EbayChatSandboxService.clearSandboxData!(sellerUsername);

            // Create sample conversations
            for (const listing of MOCK_LISTINGS.slice(0, 3)) {
                const buyer = MOCK_BUYERS[Math.floor(Math.random() * MOCK_BUYERS.length)];

                console.log(`Creating conversation for item ${listing.itemId} with buyer ${buyer.username}`);

                const conversation = new EbayConversationModel({
                    ebayItemId: listing.itemId,
                    buyerUsername: buyer.username,
                    sellerUsername: sellerUsername,
                    listingTitle: listing.title,
                    listingUrl: `https://sandbox.ebay.com/itm/${listing.itemId}`,
                    lastMessage: "Hi, is this item still available?",
                    lastMessageAt: new Date(),
                    unreadCount: Math.floor(Math.random() * 3),
                    totalMessages: Math.floor(Math.random() * 10) + 1
                });

                await conversation.save();
                console.log('Created conversation:', conversation._id);

                // Create sample messages for this conversation
                const numMessages = Math.floor(Math.random() * 5) + 2;
                for (let i = 0; i < numMessages; i++) {
                    const messageText = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
                    const isBuyerMessage = Math.random() > 0.5;

                    console.log(`Creating message ${i + 1}/${numMessages} for conversation ${conversation._id}`);

                    const message = new EbayChatModel({
                        ebayItemId: listing.itemId,
                        buyerUsername: buyer.username,
                        sellerUsername: sellerUsername,
                        messageType: isBuyerMessage ? EbayMessageType.BUYER_TO_SELLER : EbayMessageType.SELLER_TO_BUYER,
                        content: messageText,
                        ebayMessageId: `init_${listing.itemId}_${sellerUsername}_${i}_${Date.now()}`, // Make unique
                        ebayTimestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Messages over time
                        status: EbayMessageStatus.DELIVERED,
                        metadata: {
                            listingTitle: listing.title,
                            listingUrl: `https://sandbox.ebay.com/itm/${listing.itemId}`
                        }
                    });

                    await message.save();
                    console.log('Created message:', message._id);
                }
            }

            console.log('=== SANDBOX: SAMPLE DATA INITIALIZED ===');
        } catch (error: any) {
            console.error('=== SANDBOX: ERROR INITIALIZING DATA ===');
            console.error('Error details:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    },

    // Clear sandbox data
    clearSandboxData: async (sellerUsername: string): Promise<void> => {
        console.log('=== SANDBOX: CLEARING DATA ===');

        // Delete all conversations and messages for this seller
        await EbayConversationModel.deleteMany({ sellerUsername });
        await EbayChatModel.deleteMany({ sellerUsername });

        console.log('=== SANDBOX: DATA CLEARED ===');
    }
}; 
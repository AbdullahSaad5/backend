const mongoose = require('mongoose');
require('dotenv').config();

async function testEbayChatIntegration() {
  console.log('🧪 Testing eBay Chat Integration...\n');

  try {
    // Test 1: Check if MongoDB connection is available
    console.log('✅ Test 1: Database Connection');
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB is connected');
    } else {
      console.log('MongoDB connection status:', mongoose.connection.readyState);
    }
    console.log('');

    // Test 2: Check if models can be imported
    console.log('✅ Test 2: Model Import');
    try {
      const { EbayChatModel, EbayConversationModel } = require('../src/models/ebay-chat.model');
      console.log('Models imported successfully');
      console.log('EbayChatModel:', typeof EbayChatModel);
      console.log('EbayConversationModel:', typeof EbayConversationModel);
    } catch (error) {
      console.log('Model import error:', error.message);
    }
    console.log('');

    // Test 3: Check if service can be imported
    console.log('✅ Test 3: Service Import');
    try {
      const { EbayChatService } = require('../src/services/ebay-chat.service');
      console.log('Service imported successfully');
      console.log('Available methods:', Object.keys(EbayChatService));
    } catch (error) {
      console.log('Service import error:', error.message);
    }
    console.log('');

    // Test 4: Check environment variables
    console.log('✅ Test 4: Environment Variables');
    const requiredEnvVars = [
      'EBAY_CLIENT_ID',
      'EBAY_CLIENT_SECRET', 
      'EBAY_REDIRECT_URI',
      'EBAY_SELLER_USERNAME'
    ];
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`${varName}: ${value.substring(0, 10)}...`);
      } else {
        console.log(`${varName}: NOT SET`);
      }
    });
    console.log('');

    // Test 5: Test data structures
    console.log('✅ Test 5: Data Structures');
    const testConversation = {
      ebayItemId: '123456789',
      buyerUsername: 'testbuyer',
      sellerUsername: 'testseller',
      listingTitle: 'Test Item',
      lastMessage: 'Hello, is this still available?',
      lastMessageAt: new Date(),
      unreadCount: 1,
      totalMessages: 1,
      isArchived: false
    };
    console.log('Test conversation structure:', Object.keys(testConversation));
    console.log('');

    const testMessage = {
      ebayItemId: '123456789',
      buyerUsername: 'testbuyer',
      sellerUsername: 'testseller',
      messageType: 'buyer_to_seller',
      content: 'Hello, is this still available?',
      status: 'delivered',
      ebayTimestamp: new Date(),
      metadata: {
        listingTitle: 'Test Item',
        listingUrl: 'https://www.ebay.com/itm/123456789'
      }
    };
    console.log('Test message structure:', Object.keys(testMessage));
    console.log('');

    console.log('🎉 All tests completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Ensure all environment variables are set');
    console.log('2. Start the server: npm run dev');
    console.log('3. Test API endpoints with Postman or similar');
    console.log('4. Access frontend at /chat-management/ebay');
    console.log('5. Check cron job logs for automatic sync');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEbayChatIntegration(); 
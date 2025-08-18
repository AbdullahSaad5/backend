// Script to test auto-sync functionality
// This script simulates the frontend auto-sync logic

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Testing Auto-Sync Functionality');
console.log('');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas
const EmailAccountSchema = new mongoose.Schema({
  emailAddress: String,
  accountName: String,
  displayName: String,
  accountType: String,
  connectionStatus: String,
  status: String,
  isActive: Boolean,
  oauth: {
    provider: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiry: Date,
  },
  syncState: {
    syncStatus: String,
    lastHistoryId: String,
    lastSyncAt: Date,
    syncProgress: {
      totalProcessed: Number,
      currentBatch: Number,
      estimatedTotal: Number,
    },
  },
  stats: {
    totalEmails: Number,
    unreadEmails: Number,
    lastSyncAt: Date,
    lastError: String,
    lastErrorAt: Date,
  },
}, { timestamps: true });

const EmailAccountModel = mongoose.model('EmailAccount', EmailAccountSchema);

async function testAutoSyncLogic() {
  try {
    console.log('📧 Fetching Gmail accounts...');
    
    const accounts = await EmailAccountModel.find({
      accountType: 'gmail',
      isActive: true,
    });

    console.log(`Found ${accounts.length} Gmail accounts`);
    console.log('');

    for (const account of accounts) {
      console.log(`📧 Account: ${account.emailAddress}`);
      console.log(`   Connection Status: ${account.connectionStatus}`);
      console.log(`   Account Status: ${account.status}`);
      console.log(`   Sync Status: ${account.syncState?.syncStatus || 'No sync state'}`);
      console.log(`   Last History ID: ${account.syncState?.lastHistoryId ? 'Present' : 'Missing'}`);
      console.log(`   Last Sync: ${account.syncState?.lastSyncAt ? new Date(account.syncState.lastSyncAt).toLocaleString() : 'Never'}`);
      
      // Check if account needs sync (same logic as frontend)
      const needsSync = 
        account.connectionStatus === "error" ||
        account.status === "error" ||
        !account.syncState?.syncStatus ||
        !account.syncState?.lastHistoryId ||
        (account.syncState?.lastSyncAt && 
         new Date(account.syncState.lastSyncAt) < new Date(Date.now() - 15 * 60 * 1000)); // 15 minutes

      console.log(`   Needs Sync: ${needsSync ? 'YES' : 'NO'}`);
      
      if (needsSync) {
        console.log(`   🔄 This account would trigger auto-sync when selected`);
      } else {
        console.log(`   ✅ This account is up to date`);
      }
      
      console.log('');
    }

    console.log('✅ Auto-sync logic test completed');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Accounts with errors will auto-sync');
    console.log('- Accounts without sync state will auto-sync');
    console.log('- Accounts without history ID will auto-sync');
    console.log('- Accounts not synced in 15+ minutes will auto-sync');
    console.log('');
    console.log('🚀 To test:');
    console.log('1. Go to the email frontend');
    console.log('2. Switch between accounts');
    console.log('3. Accounts needing sync will automatically sync');
    console.log('4. Manual sync button is also available in the header');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testAutoSyncLogic();

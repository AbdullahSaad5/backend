require('dotenv').config();
const mongoose = require('mongoose');

// Define schemas for the script
const EmailAccountSchema = new mongoose.Schema({
  emailAddress: String,
  accountName: String,
  accountType: String,
  isActive: Boolean,
  status: String,
  connectionStatus: String,
  syncState: {
    syncStatus: String,
    lastSyncAt: Date,
    syncProgress: {
      totalProcessed: Number
    },
    lastHistoryId: String
  },
  oauth: {
    accessToken: String,
    refreshToken: String,
    provider: String
  }
}, { strict: false });

const EmailAccountModel = mongoose.model('EmailAccount', EmailAccountSchema);

async function forceFetchAllEmails() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all Gmail accounts
    const accounts = await EmailAccountModel.find({
      accountType: 'gmail',
      isActive: true
    });

    console.log(`\n📧 Found ${accounts.length} Gmail accounts`);

    if (accounts.length === 0) {
      console.log('❌ No Gmail accounts found. Please add Gmail accounts first.');
      return;
    }

    // Reset sync status for all accounts to force full sync
    console.log('\n🔄 Resetting sync status for all Gmail accounts...');
    
    for (const account of accounts) {
      console.log(`\n📧 Processing: ${account.emailAddress}`);
      
      // Reset sync state to force full sync
      await EmailAccountModel.findByIdAndUpdate(account._id, {
        $set: {
          'syncState.syncStatus': 'initial',
          'syncState.lastSyncAt': null,
          'syncState.syncProgress.totalProcessed': 0,
          'syncState.lastHistoryId': null,
          status: 'syncing'
        }
      });

      console.log(`✅ Reset sync status for ${account.emailAddress}`);
    }

    console.log('\n🎯 Next steps to fetch ALL old emails:');
    console.log('1. Go to the frontend email management page');
    console.log('2. Click "Sync Gmail with History API" button for each account');
    console.log('3. Or use the "Sync All Emails" button with fetchAll=true');
    console.log('4. The sync will now fetch ALL historical emails from Gmail');

    console.log('\n📋 Alternative: You can also manually trigger sync via API:');
    console.log('POST /email-account/accounts/{accountId}/sync-gmail-history');
    console.log('This will use the Gmail History API to fetch all emails.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

forceFetchAllEmails();

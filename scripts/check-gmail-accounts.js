require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const { EmailAccountModel } = require('../src/models/email-account.model');

async function checkGmailAccounts() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const accounts = await EmailAccountModel.find({
      accountType: 'gmail',
      isActive: true
    });

    console.log(`\n📧 Found ${accounts.length} Gmail accounts:`);
    
    if (accounts.length === 0) {
      console.log('❌ No Gmail accounts found. Please add Gmail accounts first.');
      return;
    }

    accounts.forEach((account, index) => {
      console.log(`\n${index + 1}. ${account.emailAddress}`);
      console.log(`   - Account Name: ${account.accountName}`);
      console.log(`   - Status: ${account.status}`);
      console.log(`   - Connection Status: ${account.connectionStatus}`);
      console.log(`   - Sync Status: ${account.syncState?.syncStatus || 'None'}`);
      console.log(`   - Last Sync: ${account.syncState?.lastSyncAt || 'Never'}`);
      console.log(`   - Has OAuth: ${!!account.oauth}`);
      console.log(`   - Is Active: ${account.isActive}`);
      
      if (account.syncState) {
        console.log(`   - Sync Progress: ${account.syncState.syncProgress?.totalProcessed || 0} emails processed`);
        console.log(`   - Last History ID: ${account.syncState.lastHistoryId || 'None'}`);
      }
    });

    // Check if any accounts need full sync
    const accountsNeedingFullSync = accounts.filter(account => 
      !account.syncState || 
      account.syncState.syncStatus === 'initial' || 
      account.syncState.syncStatus === 'historical'
    );

    console.log(`\n🔄 Accounts needing full sync: ${accountsNeedingFullSync.length}`);
    
    if (accountsNeedingFullSync.length > 0) {
      console.log('\nTo fetch ALL old emails, you can:');
      console.log('1. Use the "Sync Gmail with History API" button in the frontend');
      console.log('2. Or run the manual sync script');
      console.log('3. Or reset sync status to force full sync');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkGmailAccounts();

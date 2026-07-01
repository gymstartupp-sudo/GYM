require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Client = require('./models/Client');
const { runReminders } = require('./jobs/reminderJob');
const { runOverdueReminders } = require('./jobs/overdueReminderJob');

const testWorkflows = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB.');

    // Find a client to test with
    const client = await Client.findOne({ isActive: true, 'membership.requestApproved': true });
    
    if (!client) {
      console.log('No active client found to test with.');
      process.exit(0);
    }

    console.log(`Testing with client: ${client.personalInfo.name} (ID: ${client.clientId})`);

    const today = new Date();

    // ---------------------------------------------------------
    // TEST 1: Expiry in 3 days
    // ---------------------------------------------------------
    console.log('\n--- TEST 1: Expiry in 3 Days (Expiry Reminder) ---');
    let endDate1 = new Date(today);
    endDate1.setDate(today.getDate() + 3);
    
    client.membership.endDate = endDate1;
    // Reset flags
    client.membership.expiryReminderSent = false;
    client.expiryReminderSent = false;
    
    await client.save();
    
    // We need to sync status, but let's just run the job
    await runReminders();


    // ---------------------------------------------------------
    // TEST 2: Expired 1 day ago
    // ---------------------------------------------------------
    console.log('\n--- TEST 2: Expired 1 Day Ago (Expired Reminder) ---');
    let endDate2 = new Date(today);
    endDate2.setDate(today.getDate() - 1);
    
    client.membership.endDate = endDate2;
    // Reset flags
    client.membership.expiredReminderSent = false;
    client.expiredReminderSent = false;
    
    await client.save();
    
    await runReminders();


    // ---------------------------------------------------------
    // TEST 3: Overdue Reminder - Due in 3 days
    // ---------------------------------------------------------
    console.log('\n--- TEST 3: Due in 3 Days (Overdue Reminder 1) ---');
    let dueDate1 = new Date(today);
    dueDate1.setDate(today.getDate() + 3);
    
    client.paymentStatus = 'partial';
    if(client.memberships && client.memberships.length > 0) {
      client.memberships[0].dueDate = dueDate1;
      client.memberships[0].finalPrice = 1000;
      client.memberships[0].totalPaid = 500;
    }
    
    client.overdueReminders = {
      reminder1: { status: 'none' },
      reminder2: { status: 'none' },
      reminder3: { status: 'none' },
      workflowCompleted: false
    };
    
    await client.save();
    await runOverdueReminders();

    // ---------------------------------------------------------
    // TEST 4: Overdue Reminder - Due Today
    // ---------------------------------------------------------
    console.log('\n--- TEST 4: Due Today (Overdue Reminder 2) ---');
    let dueDate2 = new Date(today);
    
    if(client.memberships && client.memberships.length > 0) {
      client.memberships[0].dueDate = dueDate2;
    }
    
    await client.save();
    await runOverdueReminders();


    // ---------------------------------------------------------
    // TEST 5: Overdue Reminder - Due 3 days ago
    // ---------------------------------------------------------
    console.log('\n--- TEST 5: Due 3 days ago (Overdue Reminder 3) ---');
    let dueDate3 = new Date(today);
    dueDate3.setDate(today.getDate() - 3);
    
    if(client.memberships && client.memberships.length > 0) {
      client.memberships[0].dueDate = dueDate3;
    }
    
    await client.save();
    await runOverdueReminders();

    console.log('\nDone testing.');
    process.exit(0);

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testWorkflows();

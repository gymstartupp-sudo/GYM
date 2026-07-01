require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const Client = require('./models/Client');
const Gym = require('./models/Gym');
const { runReminders } = require('./jobs/reminderJob');
const { runOverdueReminders } = require('./jobs/overdueReminderJob');
const { getTenantConnection } = require('./utils/connectionManager');
const { runWithTenantContext } = require('./utils/tenantContext');

const testWorkflows = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    if (uri && !uri.includes('/platform_db')) {
      const url = require('url');
      try {
        const parsed = new url.URL(uri);
        parsed.pathname = '/platform_db';
        uri = parsed.toString();
      } catch (e) {
        if (uri.includes('?')) {
          uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
        } else {
          uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
        }
      }
    }
    await mongoose.connect(uri);
    console.log('Connected to platform DB.');

    // Find first active gym
    const gyms = await Gym.find({ isActive: true }).lean();
    if (gyms.length === 0) {
      console.log('No active gyms found in platform DB.');
      process.exit(0);
    }

    const gym = gyms[0];
    console.log(`Running workflow test inside tenant context: ${gym.dbName} (${gym.gymName})`);

    const conn = await getTenantConnection(gym.dbName);
    const models = {
      Client: conn.model('Client'),
      Plan: conn.model('Plan'),
      Payment: conn.model('Payment'),
      Expense: conn.model('Expense'),
      Feedback: conn.model('Feedback'),
      Counter: conn.model('Counter'),
      Setting: conn.model('Setting')
    };

    await runWithTenantContext({ tenantDb: conn, models }, async () => {
      // Find a client to test with
      const client = await Client.findOne({ isActive: true, 'membership.requestApproved': true });
      
      if (!client) {
        console.log('No active client found to test with.');
        process.exit(0);
      }

      if (!client.personalInfo.city) client.personalInfo.city = 'TestCity';
      if (!client.personalInfo.state) client.personalInfo.state = 'TestState';
      if (!client.personalInfo.pincode) client.personalInfo.pincode = '123456';

      console.log(`Testing with client: ${client.personalInfo.name} (ID: ${client.clientId})`);

      const today = new Date();

      // ---------------------------------------------------------
      // TEST 1: Expiry in 3 days
      // ---------------------------------------------------------
      console.log('\n--- TEST 1: Expiry in 3 Days (Expiry Reminder) ---');
      let endDate1 = new Date(today);
      endDate1.setDate(today.getDate() + 3);
      
      const c1 = await Client.findById(client._id);
      c1.membership.endDate = endDate1;
      // Reset flags
      c1.membership.expiryReminderSent = false;
      c1.expiryReminderSent = false;
      
      await c1.save();
      
      // We need to sync status, but let's just run the job
      await runReminders();


      // ---------------------------------------------------------
      // TEST 2: Expired 1 day ago
      // ---------------------------------------------------------
      console.log('\n--- TEST 2: Expired 1 Day Ago (Expired Reminder) ---');
      let endDate2 = new Date(today);
      endDate2.setDate(today.getDate() - 1);
      
      const c2 = await Client.findById(client._id);
      c2.membership.endDate = endDate2;
      // Reset flags
      c2.membership.expiredReminderSent = false;
      c2.expiredReminderSent = false;
      
      await c2.save();
      
      await runReminders();


      // ---------------------------------------------------------
      // TEST 3: Overdue Reminder - Due in 3 days
      // ---------------------------------------------------------
      console.log('\n--- TEST 3: Due in 3 Days (Overdue Reminder 1) ---');
      let dueDate1 = new Date(today);
      dueDate1.setDate(today.getDate() + 3);
      
      const c3 = await Client.findById(client._id);
      c3.paymentStatus = 'partial';
      if(c3.memberships && c3.memberships.length > 0) {
        c3.memberships[0].dueDate = dueDate1;
        c3.memberships[0].finalPrice = 1000;
        c3.memberships[0].totalPaid = 500;
      }
      
      c3.overdueReminders = {
        reminder1: { status: 'none' },
        reminder2: { status: 'none' },
        reminder3: { status: 'none' },
        workflowCompleted: false
      };
      
      await c3.save();
      await runOverdueReminders();

      // ---------------------------------------------------------
      // TEST 4: Overdue Reminder - Due Today
      // ---------------------------------------------------------
      console.log('\n--- TEST 4: Due Today (Overdue Reminder 2) ---');
      let dueDate2 = new Date(today);
      
      const c4 = await Client.findById(client._id);
      if(c4.memberships && c4.memberships.length > 0) {
        c4.memberships[0].dueDate = dueDate2;
      }
      
      await c4.save();
      await runOverdueReminders();


      // ---------------------------------------------------------
      // TEST 5: Overdue Reminder - Due 3 days ago
      // ---------------------------------------------------------
      console.log('\n--- TEST 5: Due 3 days ago (Overdue Reminder 3) ---');
      let dueDate3 = new Date(today);
      dueDate3.setDate(today.getDate() - 3);
      
      const c5 = await Client.findById(client._id);
      if(c5.memberships && c5.memberships.length > 0) {
        c5.memberships[0].dueDate = dueDate3;
      }
      
      await c5.save();
      await runOverdueReminders();

      console.log('\nDone testing.');
      process.exit(0);
    });

  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testWorkflows();

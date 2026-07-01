require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Gym = require('../models/Gym');
const Owner = require('../models/Owner');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const Expense = require('../models/Expense');
const Counter = require('../models/Counter');
const Feedback = require('../models/Feedback');

const runAudit = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.\n');

    const auditResults = {
      counts: {},
      gymOwnedMissingGymId: {},
      tenantIsolationViolations: {},
      duplicateIdentifiers: {
        gymId: [],
        clientIdGlobal: [],
        clientIdPerGym: [],
        paymentIdGlobal: [],
        paymentIdPerGym: [],
        planIdPerGym: []
      },
      orphanRecords: {
        paymentsMissingClient: [],
        paymentsMissingGym: [],
        plansMissingGym: [],
        expensesMissingGym: [],
        feedbacksMissingGym: [],
        feedbacksMissingClient: [],
        clientsMissingGym: [],
        clientMembershipsMissingPlan: [],
        clientPaymentsMissingPayment: []
      },
      schemaInconsistencies: {},
      redundantFieldsUsage: {},
      indexes: {}
    };

    // 1. Document Counts
    console.log('--- Document Counts ---');
    const models = { Gym, Owner, Admin, Client, Payment, Plan, Expense, Counter, Feedback };
    for (const [name, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      auditResults.counts[name] = count;
      console.log(`${name}: ${count} documents`);
    }
    console.log('');

    // Fetch all gyms
    const gyms = await Gym.find({});
    const gymIds = new Set(gyms.map(g => g.gymId));
    const gymObjectIds = new Set(gyms.map(g => g._id.toString()));
    console.log(`Valid Gym IDs (String): ${Array.from(gymIds).join(', ')}`);
    console.log(`Valid Gym ObjectIds: ${Array.from(gymObjectIds).join(', ')}\n`);

    // Fetch clients
    const clients = await Client.find({});
    const clientObjectIds = new Set(clients.map(c => c._id.toString()));
    const clientIds = new Set(clients.map(c => c.clientId).filter(Boolean));

    // Fetch payments
    const payments = await Payment.find({});
    const paymentObjectIds = new Set(payments.map(p => p._id.toString()));

    // Fetch plans
    const plans = await Plan.find({});
    const planObjectIds = new Set(plans.map(p => p._id.toString()));

    // 2. Verify gym-owned documents contain gymId and isolation
    console.log('--- Checking Gym-Owned Documents and Tenant Isolation ---');
    const gymOwnedModels = { Client, Payment, Plan, Expense, Feedback };
    
    for (const [name, model] of Object.entries(gymOwnedModels)) {
      const missingGymIdDocs = await model.find({
        $or: [
          { gymId: { $exists: false } },
          { gymId: null },
          { gymId: '' }
        ]
      });
      if (missingGymIdDocs.length > 0) {
        auditResults.gymOwnedMissingGymId[name] = missingGymIdDocs.map(d => d._id.toString());
        console.log(`[WARNING] ${name} has ${missingGymIdDocs.length} documents missing 'gymId'.`);
      } else {
        console.log(`[OK] All ${name} documents have 'gymId'.`);
      }

      const invalidGymIdDocs = await model.find({
        gymId: { $nin: Array.from(gymIds) }
      });
      if (invalidGymIdDocs.length > 0) {
        auditResults.tenantIsolationViolations[name] = invalidGymIdDocs.map(d => ({
          id: d._id.toString(),
          gymId: d.gymId
        }));
        console.log(`[WARNING] ${name} has ${invalidGymIdDocs.length} documents referencing non-existent gymId.`);
      } else {
        console.log(`[OK] All ${name} documents reference valid gymIds.`);
      }
    }
    console.log('');

    // Check Owners
    const ownersMissingGymId = await Owner.find({
      $or: [
        { gymId: { $exists: false } },
        { gymId: null }
      ]
    });
    if (ownersMissingGymId.length > 0) {
      console.log(`[WARNING] Owner collection has ${ownersMissingGymId.length} documents missing 'gymId'.`);
    }
    const invalidOwnerGymId = await Owner.find({
      gymId: { $nin: Array.from(gymObjectIds).map(id => new mongoose.Types.ObjectId(id)) }
    });
    if (invalidOwnerGymId.length > 0) {
      console.log(`[WARNING] Owner has ${invalidOwnerGymId.length} documents referencing non-existent Gym _id.`);
    }

    // 3. Detect duplicate business identifiers
    console.log('--- Detecting Duplicate Identifiers ---');
    
    const gymIdGroup = await Gym.aggregate([
      { $group: { _id: '$gymId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    auditResults.duplicateIdentifiers.gymId = gymIdGroup.map(g => g._id);
    if (gymIdGroup.length > 0) {
      console.log(`[CRITICAL] Duplicate gymIds found: ${JSON.stringify(gymIdGroup)}`);
    } else {
      console.log('[OK] No duplicate gymIds.');
    }

    const clientIdGlobalGroup = await Client.aggregate([
      { $group: { _id: '$clientId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);
    auditResults.duplicateIdentifiers.clientIdGlobal = clientIdGlobalGroup.map(g => g._id);
    console.log(`Found ${clientIdGlobalGroup.length} clientIds duplicated globally.`);

    const clientIdPerGymGroup = await Client.aggregate([
      { $group: { _id: { gymId: '$gymId', clientId: '$clientId' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, '_id.clientId': { $ne: null } } }
    ]);
    auditResults.duplicateIdentifiers.clientIdPerGym = clientIdPerGymGroup.map(g => g._id);
    if (clientIdPerGymGroup.length > 0) {
      console.log(`[CRITICAL] Duplicate clientIds within the same gym:`, clientIdPerGymGroup);
    } else {
      console.log('[OK] No duplicate clientIds within any individual gym.');
    }

    const paymentIdGlobalGroup = await Payment.aggregate([
      { $group: { _id: '$paymentId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, _id: { $ne: null } } }
    ]);
    auditResults.duplicateIdentifiers.paymentIdGlobal = paymentIdGlobalGroup.map(g => g._id);
    console.log(`Found ${paymentIdGlobalGroup.length} paymentIds duplicated globally.`);

    const paymentIdPerGymGroup = await Payment.aggregate([
      { $group: { _id: { gymId: '$gymId', paymentId: '$paymentId' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 }, '_id.paymentId': { $ne: null } } }
    ]);
    auditResults.duplicateIdentifiers.paymentIdPerGym = paymentIdPerGymGroup.map(g => g._id);
    if (paymentIdPerGymGroup.length > 0) {
      console.log(`[CRITICAL] Duplicate paymentIds within the same gym:`, paymentIdPerGymGroup);
    } else {
      console.log('[OK] No duplicate paymentIds within any individual gym.');
    }

    const planIdPerGymGroup = await Plan.aggregate([
      { $group: { _id: { gymId: '$gymId', name: '$name' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    auditResults.duplicateIdentifiers.planIdPerGym = planIdPerGymGroup.map(g => g._id);
    if (planIdPerGymGroup.length > 0) {
      console.log(`[WARNING] Duplicate Plan names within the same gym:`, planIdPerGymGroup);
    } else {
      console.log('[OK] No duplicate Plan names within any individual gym.');
    }
    console.log('');

    // 4. Detect Orphan Records and Referential Integrity
    console.log('--- Checking Referential Integrity / Orphan Records ---');
    
    for (const client of clients) {
      if (!gymIds.has(client.gymId)) {
        auditResults.orphanRecords.clientsMissingGym.push(client._id.toString());
      }
      
      if (client.memberships && client.memberships.length > 0) {
        for (const membership of client.memberships) {
          if (membership.planId && !planObjectIds.has(membership.planId.toString())) {
            auditResults.orphanRecords.clientMembershipsMissingPlan.push({
              clientId: client._id.toString(),
              planId: membership.planId.toString(),
              planName: membership.planName
            });
          }
        }
      }

      if (client.paymentHistory && client.paymentHistory.length > 0) {
        for (const payId of client.paymentHistory) {
          if (payId && !paymentObjectIds.has(payId.toString())) {
            auditResults.orphanRecords.clientPaymentsMissingPayment.push({
              clientId: client._id.toString(),
              paymentId: payId.toString()
            });
          }
        }
      }
    }

    for (const pay of payments) {
      if (!gymIds.has(pay.gymId)) {
        auditResults.orphanRecords.paymentsMissingGym.push(pay._id.toString());
      }
      
      const clientObj = clients.find(c => c._id.toString() === pay.clientId || c.clientId === pay.clientId);
      if (!clientObj) {
        auditResults.orphanRecords.paymentsMissingClient.push({
          paymentId: pay._id.toString(),
          paymentBusinessId: pay.paymentId,
          clientIdReferenced: pay.clientId
        });
      }
    }

    for (const plan of plans) {
      if (!gymIds.has(plan.gymId)) {
        auditResults.orphanRecords.plansMissingGym.push(plan._id.toString());
      }
    }

    const expenses = await Expense.find({});
    for (const exp of expenses) {
      if (!gymIds.has(exp.gymId)) {
        auditResults.orphanRecords.expensesMissingGym.push(exp._id.toString());
      }
    }

    const feedbacks = await Feedback.find({});
    for (const fb of feedbacks) {
      if (!gymIds.has(fb.gymId)) {
        auditResults.orphanRecords.feedbacksMissingGym.push(fb._id.toString());
      }
      if (fb.clientObjectId && !clientObjectIds.has(fb.clientObjectId.toString())) {
        auditResults.orphanRecords.feedbacksMissingClient.push({
          feedbackId: fb._id.toString(),
          clientObjectIdReferenced: fb.clientObjectId.toString()
        });
      }
    }

    console.log(`Orphan clients (missing gym): ${auditResults.orphanRecords.clientsMissingGym.length}`);
    console.log(`Orphan payments (missing gym): ${auditResults.orphanRecords.paymentsMissingGym.length}`);
    console.log(`Orphan payments (missing client): ${auditResults.orphanRecords.paymentsMissingClient.length}`);
    console.log(`Orphan client memberships (missing plan): ${auditResults.orphanRecords.clientMembershipsMissingPlan.length}`);
    console.log(`Orphan client paymentHistory entries (missing payment doc): ${auditResults.orphanRecords.clientPaymentsMissingPayment.length}`);
    console.log(`Orphan plans (missing gym): ${auditResults.orphanRecords.plansMissingGym.length}`);
    console.log(`Orphan expenses (missing gym): ${auditResults.orphanRecords.expensesMissingGym.length}`);
    console.log(`Orphan feedbacks (missing gym): ${auditResults.orphanRecords.feedbacksMissingGym.length}`);
    console.log(`Orphan feedbacks (missing client): ${auditResults.orphanRecords.feedbacksMissingClient.length}`);
    console.log('');

    // 5. Schema Inconsistencies
    console.log('--- Checking Schema Inconsistencies ---');
    const allCollections = { Gym, Owner, Client, Payment, Plan, Expense, Feedback };
    for (const [name, model] of Object.entries(allCollections)) {
      const docs = await model.find({}).limit(500);
      const keysTypes = {};

      docs.forEach(doc => {
        const obj = doc.toObject();
        const flattenKeys = (o, prefix = '') => {
          for (const key of Object.keys(o)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const val = o[key];
            const type = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
            
            if (!keysTypes[fullKey]) {
              keysTypes[fullKey] = new Set();
            }
            keysTypes[fullKey].add(type);

            if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
              flattenKeys(val, fullKey);
            }
          }
        };
        flattenKeys(obj);
      });

      const inconsistencies = [];
      for (const [key, types] of Object.entries(keysTypes)) {
        if (types.size > 1) {
          inconsistencies.push({ key, types: Array.from(types) });
        }
      }

      if (inconsistencies.length > 0) {
        auditResults.schemaInconsistencies[name] = inconsistencies;
        console.log(`[WARNING] Collection ${name} has schema inconsistencies:`, inconsistencies);
      } else {
        console.log(`[OK] Collection ${name} is structurally consistent.`);
      }
    }
    console.log('');

    // 6. Redundant Fields
    console.log('--- Checking Redundant/Deprecated Fields in Payments ---');
    const deprecatedFields = ['amount', 'mode', 'date'];
    auditResults.redundantFieldsUsage.payments = {};
    for (const field of deprecatedFields) {
      const populatedCount = await Payment.countDocuments({ [field]: { $exists: true, $ne: null } });
      auditResults.redundantFieldsUsage.payments[field] = populatedCount;
      console.log(`Payment doc with deprecated field '${field}' populated: ${populatedCount} / ${payments.length}`);
    }
    console.log('');

    // 7. Indexes
    console.log('--- Indexing Strategy ---');
    for (const [name, model] of Object.entries(allCollections)) {
      const indexes = await model.collection.indexes();
      auditResults.indexes[name] = indexes;
      console.log(`Collection ${name} has ${indexes.length} indexes.`);
    }
    console.log('');

    // Write full audit results to a JSON file
    const outputPath = path.join(__dirname, 'audit_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
    console.log(`[SUCCESS] Full audit report details saved to: ${outputPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
};

runAudit();

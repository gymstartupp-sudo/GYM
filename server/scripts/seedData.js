/**
 * SEED SCRIPT: Adds 10 gyms with 100 clients each
 * Clients have varied membership statuses: active, expired, expiring_soon, upcoming, pending
 * Payment statuses: paid, partial, overdue
 * Run with: node scripts/seedData.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Constants ────────────────────────────────────────────────────────────────
const GYMS_TO_CREATE = 10;
const CLIENTS_PER_GYM = 100;
const HASHED_PASSWORD = bcrypt.hashSync('Test@1234', 10);

// ─── Indian cities/states pool ────────────────────────────────────────────────
const CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { city: 'Delhi', state: 'Delhi', pincode: '110001' },
  { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { city: 'Surat', state: 'Gujarat', pincode: '395001' },
];

const GYM_TYPES = ['Fitness Center', 'CrossFit Box', 'Yoga Studio', 'MMA Gym', 'Bodybuilding Gym', 'Functional Training', 'Pilates Studio', 'Zumba Studio'];
const TAGLINES = [
  'Sweat. Smile. Repeat.',
  'Your fitness journey starts here.',
  'Train hard. Live strong.',
  'Where champions are made.',
  'Push your limits every day.',
  'Stronger every session.',
  'Fitness for life.',
  'Unleash your potential.',
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Atharv', 'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Kabir', 'Ritvik',
  'Aaryan', 'Hrithik', 'Rohan', 'Nikhil', 'Dev', 'Priya', 'Ananya', 'Ishita',
  'Sanya', 'Aditi', 'Riya', 'Kavya', 'Divya', 'Pooja', 'Sneha', 'Meera',
  'Nisha', 'Simran', 'Tanvi', 'Shreya', 'Anjali', 'Neha', 'Komal', 'Preeti',
  'Deepa', 'Rahul', 'Amit', 'Suresh', 'Rajesh', 'Vijay', 'Sanjay', 'Ramesh',
  'Mahesh', 'Ganesh', 'Naresh', 'Mukesh', 'Sunil', 'Anil', 'Kapil', 'Nitin',
  'Sachin', 'Varun', 'Tarun', 'Karan', 'Manish', 'Danish',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Mehta',
  'Joshi', 'Pandey', 'Rao', 'Nair', 'Menon', 'Iyer', 'Pillai', 'Reddy',
  'Naidu', 'Choudhary', 'Yadav', 'Mishra', 'Tiwari', 'Dubey', 'Sinha',
  'Bose', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Das', 'Sen', 'Roy',
];

const PLANS = [
  { name: 'Monthly', durationMonths: 1, price: 800 },
  { name: 'Quarterly', durationMonths: 3, price: 2200 },
  { name: 'Half-Yearly', durationMonths: 6, price: 4000 },
  { name: 'Annual', durationMonths: 12, price: 7000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const padNum = (n, len = 2) => String(n).padStart(len, '0');

// Generate unique phone numbers using a global counter to avoid duplicates
let phoneCounter = 9000000000;
const nextPhone = () => String(++phoneCounter);

let emailCounter = 0;
const nextEmail = (name, gymIdx) => {
  emailCounter++;
  const safe = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  return `${safe}.g${gymIdx}.${emailCounter}@testgym.com`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const subtractMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
};

// ─── Status distribution (100 clients split into 5 scenarios) ─────────────────
// active(50), expired(20), expiring_soon(10), upcoming(10), pending(10)
const getStatusScenario = (index) => {
  if (index < 50) return 'active';
  if (index < 70) return 'expired';
  if (index < 80) return 'expiring_soon';
  if (index < 90) return 'upcoming';
  return 'pending';
};

// ─── Payment status distribution ──────────────────────────────────────────────
// paid(60%), partial(25%), overdue(15%)
const getPaymentStatus = (clientIndex, membershipStatus) => {
  if (membershipStatus === 'expired') return pick(['paid', 'overdue']);
  if (membershipStatus === 'pending') return 'paid';
  const r = clientIndex % 10;
  if (r < 6) return 'paid';
  if (r < 9) return 'partial';
  return 'overdue';
};

const buildMembershipDates = (status, plan) => {
  const now = new Date();
  let startDate, endDate;

  switch (status) {
    case 'active': {
      // Started 1-15 days ago, ends in future beyond 7 days
      startDate = addDays(now, -rand(1, Math.max(1, plan.durationMonths * 30 - 10)));
      endDate = addMonths(startDate, plan.durationMonths);
      // Make sure end is really in future (>7 days)
      if (endDate <= addDays(now, 7)) {
        startDate = addDays(now, -rand(1, 5));
        endDate = addMonths(startDate, plan.durationMonths);
      }
      break;
    }
    case 'expiring_soon': {
      // Ends in 1-7 days
      endDate = addDays(now, rand(1, 7));
      startDate = subtractMonths(endDate, plan.durationMonths);
      break;
    }
    case 'expired': {
      // Ended 1-60 days ago
      endDate = addDays(now, -rand(1, 60));
      startDate = subtractMonths(endDate, plan.durationMonths);
      break;
    }
    case 'upcoming': {
      // Starts in 3-20 days
      startDate = addDays(now, rand(3, 20));
      endDate = addMonths(startDate, plan.durationMonths);
      break;
    }
    case 'pending': {
      // Pending approval - start ~today
      startDate = addDays(now, rand(-2, 2));
      endDate = addMonths(startDate, plan.durationMonths);
      break;
    }
    default: {
      startDate = addDays(now, -rand(5, 15));
      endDate = addMonths(startDate, plan.durationMonths);
    }
  }

  return { startDate, endDate };
};

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Starting seed script...\n');

  // Connect to platform DB
  let uri = process.env.MONGODB_URI;
  if (!uri.includes('/platform_db')) {
    if (uri.includes('?')) {
      uri = uri.replace(/\/[^/?]*\?/, '/platform_db?');
    } else {
      uri = uri.endsWith('/') ? uri + 'platform_db' : uri + '/platform_db';
    }
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to platform_db\n');

  // Load platform-level models (Gym, Counter)
  const gymSchema = require('../models/Gym').schema || (() => {
    const Gym = require('../models/Gym');
    return Gym.schema;
  })();

  // We need direct mongoose models for platform db
  const GymModel = mongoose.models.Gym || mongoose.model('Gym', require('../models/Gym').schema);
  const CounterModel = mongoose.models.Counter || mongoose.model('Counter', require('../models/Counter').schema);

  const { getTenantConnection } = require('../utils/connectionManager');

  const createdGyms = [];

  // ── Create 10 gyms ──────────────────────────────────────────────────────────
  for (let g = 0; g < GYMS_TO_CREATE; g++) {
    const location = CITIES[g];
    const gymNum = g + 1;
    const gymName = `${pick(['FitZone', 'PowerHouse', 'IronGrip', 'EliteFit', 'PeakPerform', 'MaxFlex', 'CoreForce', 'VitalFit', 'PrimeGym', 'NovaSport'])} ${gymNum}`;
    const ownerFirst = pick(FIRST_NAMES);
    const ownerLast = pick(LAST_NAMES);
    const ownerName = `${ownerFirst} ${ownerLast}`;
    const gymEmail = `gym${gymNum}.seed@testgym.com`;
    const gymContact = nextPhone();
    const dbName = `gym_seed_${gymNum}_db`;

    // Check if gym already exists
    const existing = await GymModel.findOne({ gymEmail });
    if (existing) {
      console.log(`⚠️  Gym ${gymName} already exists (${gymEmail}), skipping...`);
      createdGyms.push(existing);
      continue;
    }

    // Get next gymId
    const counter = await CounterModel.findOneAndUpdate(
      { name: 'NEX_GYM_SEQUENCE' },
      { $inc: { value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const lastGym = await GymModel.findOne({ gymId: /^NEX-/ }).sort({ gymId: -1 });
    let lastCount = 0;
    if (lastGym?.gymId) {
      const parts = lastGym.gymId.split('-');
      lastCount = parseInt(parts[1], 10) || 0;
    }
    let seq = counter.value;
    if (seq <= lastCount) {
      const fixed = await CounterModel.findOneAndUpdate(
        { name: 'NEX_GYM_SEQUENCE' },
        { $set: { value: lastCount + 1 } },
        { new: true, upsert: true }
      );
      seq = fixed.value;
    }
    const gymId = `NEX-${padNum(seq)}`;

    const gym = await GymModel.create({
      gymId,
      gymName,
      gymEmail,
      gymContact,
      password: HASHED_PASSWORD,
      owner: {
        name: ownerName,
        email: `owner${gymNum}.seed@testgym.com`,
        mobile: nextPhone(),
      },
      address: `${rand(1, 999)}, Main Road, ${location.city}`,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      gymType: pick(GYM_TYPES),
      tagline: pick(TAGLINES),
      operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      operatingHours: { open: '06:00', close: '22:00' },
      billingInfo: {
        billingIdPrefix: 'BILL',
        helpContact: gymContact,
        allowPartialPayments: true,
      },
      dbName,
      status: 'Active',
      subscription: 'Premium',
      isActive: true,
    });

    console.log(`✅ Created Gym [${gymId}] ${gymName} → DB: ${dbName}`);
    createdGyms.push(gym);
  }

  console.log(`\n🏋️  ${createdGyms.length} gyms ready. Now seeding clients...\n`);

  // ── For each gym, connect to tenant DB and seed plans + clients ──────────────
  for (const gym of createdGyms) {
    console.log(`\n━━━ Processing ${gym.gymName} (${gym.gymId}) ━━━`);

    const tenantConn = await getTenantConnection(gym.dbName);

    // Get or create tenant models
    const ClientModel = tenantConn.models.Client || tenantConn.model('Client', require('../models/Client').schema);
    const PlanModel = tenantConn.models.Plan || tenantConn.model('Plan', require('../models/Plan').schema);
    const PaymentModel = tenantConn.models.Payment || tenantConn.model('Payment', require('../models/Payment').schema);
    const TenantCounter = tenantConn.models.Counter || tenantConn.model('Counter', require('../models/Counter').schema);

    // ── Seed plans ──────────────────────────────────────────────────────────
    const createdPlans = [];
    for (const planDef of PLANS) {
      const normName = planDef.name.trim().toLowerCase();
      let plan = await PlanModel.findOne({ normalizedName: normName });
      if (!plan) {
        try {
          plan = await PlanModel.create({
            gymId: gym.gymId,
            name: planDef.name,
            normalizedName: normName,
            durationMonths: planDef.durationMonths,
            price: planDef.price,
            isActive: true,
          });
          console.log(`  📋 Created plan: ${planDef.name}`);
        } catch (e) {
          plan = await PlanModel.findOne({ normalizedName: normName });
          if (!plan) throw e;
        }
      }
      createdPlans.push(plan);
    }

    // ── Seed 100 clients ────────────────────────────────────────────────────
    let clientsCreated = 0;
    for (let i = 0; i < CLIENTS_PER_GYM; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const email = nextEmail(fullName, gym.gymId);
      const mobile = nextPhone();
      const membershipStatus = getStatusScenario(i);
      const paymentStatus = getPaymentStatus(i, membershipStatus);
      const plan = pick(createdPlans);
      const { startDate, endDate } = buildMembershipDates(membershipStatus, plan);

      // Compute daysLeft
      const now = new Date();
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      // Build payment amounts
      let finalPrice = plan.price;
      let totalPaid, remainingBalance;
      if (paymentStatus === 'paid') {
        totalPaid = finalPrice;
        remainingBalance = 0;
      } else if (paymentStatus === 'partial') {
        totalPaid = Math.floor(finalPrice * (rand(3, 7) / 10));
        remainingBalance = finalPrice - totalPaid;
      } else {
        // overdue
        totalPaid = 0;
        remainingBalance = finalPrice;
      }

      // Generate client ID
      const clientSeq = await TenantCounter.findOneAndUpdate(
        { name: `clientId:${gym.gymId}` },
        { $inc: { value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      const clientId = `CL-${padNum(clientSeq.value)}`;

      // DOB: between 18-50 years ago
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - rand(18, 50));

      const genders = ['Male', 'Female'];
      const gender = pick(genders);

      // Build membership object
      const membership = {
        planId: plan._id,
        planName: plan.name,
        planDurationMonths: plan.durationMonths,
        durationMonths: plan.durationMonths,
        startDate,
        endDate,
        daysLeft: Math.max(0, daysLeft),
        status: membershipStatus,
        requestApproved: membershipStatus !== 'pending',
        finalPrice,
        totalPaid,
        dueDate: paymentStatus !== 'paid' ? addDays(startDate, 15) : null,
      };

      // Build memberships array entry
      const membershipsEntry = {
        planId: plan._id,
        planName: plan.name,
        planDurationMonths: plan.durationMonths,
        startDate,
        endDate,
        finalPrice,
        totalPaid,
        dueDate: paymentStatus !== 'paid' ? addDays(startDate, 15) : null,
      };

      let client;
      try {
        client = await ClientModel.create({
          clientId,
          gymId: gym.gymId,
          gymName: gym.gymName,
          personalInfo: {
            name: fullName,
            dob,
            gender,
            address: `${rand(1, 999)}, Street ${rand(1, 50)}, ${gym.city}`,
            city: gym.city,
            state: gym.state,
            pincode: gym.pincode,
            email,
            mobileNo: mobile,
            whatsappNumber: mobile,
          },
          whatsappNumber: mobile,
          password: HASHED_PASSWORD,
          membership,
          memberships: [membershipsEntry],
          paymentStatus,
          hasPartialPayment: paymentStatus === 'partial',
          isActive: membershipStatus !== 'expired' || Math.random() > 0.3,
          isDeleted: false,
        });
      } catch (err) {
        // Skip duplicate email/phone collisions silently
        if (err.code === 11000) continue;
        throw err;
      }

      // ── Create payment record ────────────────────────────────────────────
      const paySeq = await TenantCounter.findOneAndUpdate(
        { name: `paymentId:${gym.gymId}:BILL` },
        { $inc: { value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      const paymentId = `BILL-${String(paySeq.value).padStart(3, '0')}`;

      const paymentMethods = ['cash', 'upi', 'card'];
      const paymentMethod = pick(paymentMethods);

      try {
        const payment = await PaymentModel.create({
          paymentId,
          gymId: gym.gymId,
          clientId: client._id.toString(),
          clientName: fullName,
          planId: plan._id,
          planName: plan.name,
          invoiceAmount: finalPrice,
          paidNow: totalPaid,
          paidAmount: totalPaid,
          totalPaid,
          remainingBalance,
          status: paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partial' ? 'partial' : 'overdue',
          paymentMethod,
          paymentDate: startDate,
          startDate,
          dueDate: paymentStatus !== 'paid' ? addDays(startDate, 15) : null,
          isPlanActivated: true,
          idempotencyKey: `seed-${gym.gymId}-${client._id.toString()}-${paymentId}`,
        });

        // Link payment to client
        await ClientModel.updateOne(
          { _id: client._id },
          { $push: { paymentHistory: payment._id } }
        );
      } catch (payErr) {
        if (payErr.code !== 11000) console.warn(`  ⚠️  Payment creation failed for ${fullName}:`, payErr.message);
      }

      clientsCreated++;
    }

    console.log(`  ✅ Seeded ${clientsCreated} clients for ${gym.gymName}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n\n═══════════════════════════════════════');
  console.log('🎉 SEED COMPLETE!');
  console.log('═══════════════════════════════════════');
  console.log(`Gyms Created  : ${createdGyms.length}`);
  console.log(`Clients/Gym   : up to ${CLIENTS_PER_GYM}`);
  console.log('\nGym Login Password : Test@1234');
  console.log('Client Password    : Test@1234');
  console.log('\nStatus Distribution per Gym (100 clients):');
  console.log('  active        : 50 clients  (index 0-49)');
  console.log('  expired       : 20 clients  (index 50-69)');
  console.log('  expiring_soon : 10 clients  (index 70-79)');
  console.log('  upcoming      : 10 clients  (index 80-89)');
  console.log('  pending       : 10 clients  (index 90-99)');
  console.log('\nPayment Distribution:');
  console.log('  paid    : ~60%');
  console.log('  partial : ~25%');
  console.log('  overdue : ~15%');
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});

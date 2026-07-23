const path = require('path');
const fs = require('fs');
const { generatePaymentPDF } = require('../services/pdfService');

const dummyPayment = {
  paymentId: 'BILL-TEST-999',
  paymentDate: new Date(),
  amount: 2500,
  paidNow: 1500,
  paidAmount: 1500,
  totalPaid: 1500,
  remainingBalance: 1000,
  status: 'partial',
  paymentMethod: 'upi',
  planName: 'Gold 3 Months',
  planDurationMonths: 3,
  startDate: new Date(),
  dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
};

const dummyClient = {
  personalInfo: {
    name: 'John Doe',
    email: 'johndoe@example.com',
    mobileNo: '9876543210',
    whatsappNumber: '9876543210'
  },
  memberships: [
    {
      planId: 'plan123',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    }
  ]
};

const dummyGym = {
  gymName: 'Alpha Fitness Gym',
  tagline: 'Get Stronger Every Day',
  address: '123 Muscle Street',
  gymContact: '9999988888',
  gst: '27AAAAA1111A1Z1',
  billingInfo: {
    addressOnBill: '123 Muscle Street, Mumbai, MH - 400001',
    regards: 'Alpha Management'
  }
};

const runTest = async () => {
  try {
    console.log('Generating sample PDF...');
    const outputPath = await generatePaymentPDF(dummyPayment, dummyClient, dummyGym);
    console.log('PDF successfully generated at:', outputPath);
    
    if (fs.existsSync(outputPath)) {
      console.log('Verification Success: PDF file exists and has size:', fs.statSync(outputPath).size, 'bytes');
      // Clean up test file
      fs.unlinkSync(outputPath);
      console.log('Cleaned up test PDF file.');
    } else {
      console.error('Verification Failure: File does not exist!');
      process.exit(1);
    }
  } catch (err) {
    console.error('PDF Generation test failed with error:', err);
    process.exit(1);
  }
};

runTest();

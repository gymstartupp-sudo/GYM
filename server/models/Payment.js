const mongoose = require('mongoose');
const { createTenantModelProxy } = require('../utils/tenantContext');

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true }, // Prevents duplicate payments
  gymId: { type: String },
  clientId: { type: String, required: true },
  clientName: { type: String },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  planName: { type: String },
  amount: { type: Number }, // DEPRECATED: use invoiceAmount
  paidAmount: { type: Number }, // Per-transaction amount paid (same as paidNow)
  invoiceAmount: { type: Number }, // Original total price of the plan
  paidNow: { type: Number }, // Amount paid in THIS transaction
  totalPaid: { type: Number }, // Cumulative amount paid for this membership so far
  remainingBalance: { type: Number }, // Remaining balance after this transaction
  status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue'] },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card'] },
  mode: { type: String }, // DEPRECATED: use paymentMethod
  paymentDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  startDate: { type: Date },
  isPlanActivated: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }, // DEPRECATED: use paymentDate
  billSentViaWhatsApp: { type: Boolean, default: false },
  razorpay_payment_id: { type: String, default: null },
  invoiceSentOn: { type: Date, default: null },
  invoiceWhatsAppStatus: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: null },
  invoiceMessageId: { type: String, default: null },
  invoicePDFUrl: { type: String, default: null },
  invoiceError: { type: String, default: null }
}, { timestamps: true });

paymentSchema.index({ clientId: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ clientId: 1, planId: 1, startDate: 1 });
paymentSchema.index({ paymentId: 1 }, { unique: true });

const Payment = createTenantModelProxy('Payment', paymentSchema);
Payment.schema = paymentSchema;

module.exports = Payment;


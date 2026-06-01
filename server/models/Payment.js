const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },
  idempotencyKey: { type: String, unique: true, sparse: true }, // Prevents duplicate payments
  gymId: { type: String, required: true },
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
  billSentViaWhatsApp: { type: Boolean, default: false }
}, { timestamps: true });

paymentSchema.index({ clientId: 1 });
paymentSchema.index({ gymId: 1, createdAt: -1 });
paymentSchema.index({ gymId: 1, clientId: 1, planId: 1, startDate: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

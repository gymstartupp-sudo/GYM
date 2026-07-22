const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an elegant PDF receipt for a recorded payment.
 * @param {Object} payment - The payment record
 * @param {Object} client - The client record
 * @param {Object} gym - The gym record
 * @returns {Promise<string>} Path to the generated PDF file
 */
const generatePaymentPDF = async (payment, client, gym) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = `receipt-${payment.paymentId || 'PAY'}-${Date.now()}.pdf`;
      const directory = path.join(__dirname, '..', 'uploads');
      
      // Ensure directory exists
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      const outputPath = path.join(directory, filename);
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      
      doc.pipe(writeStream);
      
      // Helper: Draw line
      const drawLine = (y) => {
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
      };

      // Header: Gym Details
      doc.fillColor('#1f2937')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(gym.gymName, 40, 50);
         
      if (gym.tagline) {
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .fillColor('#6b7280')
           .text(gym.tagline, 40, 75);
      }
      
      // Gym Billing Info (top-right side)
      let billingY = 50;
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#4b5563');
      
      const gymAddress = gym.billingInfo?.addressOnBill || gym.address || '';
      doc.text(gymAddress, 350, billingY, { width: 205, align: 'right' });
      billingY += 25;
      
      if (gym.gst) {
        doc.text(`GSTIN: ${gym.gst}`, 350, billingY, { width: 205, align: 'right' });
        billingY += 12;
      }
      if (gym.gymContact) {
        doc.text(`Contact: ${gym.gymContact}`, 350, billingY, { width: 205, align: 'right' });
      }

      // Title
      doc.fillColor('#111827')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', 40, 130);
         
      drawLine(150);

      // Metadata Blocks (Invoice info & Client info side-by-side)
      doc.fontSize(10).fillColor('#374151');
      
      // Column 1: Invoice metadata
      let metaY = 165;
      doc.font('Helvetica-Bold').text('Receipt Details:', 40, metaY);
      doc.font('Helvetica').text(`Receipt No: ${payment.paymentId}`, 40, metaY + 18);
      
      const pDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
      const formattedDate = pDate.toLocaleDateString('en-GB').replace(/\//g, '-');
      doc.text(`Date: ${formattedDate}`, 40, metaY + 32);
      
      const statusText = (payment.status || 'paid').toUpperCase();
      doc.text(`Status: `, 40, metaY + 46);
      doc.font('Helvetica-Bold')
         .fillColor(payment.status === 'paid' ? '#10b981' : (payment.status === 'partial' ? '#f59e0b' : '#ef4444'))
         .text(statusText, 80, metaY + 46);
         
      // Column 2: Client details
      doc.font('Helvetica-Bold').fillColor('#374151').text('Billed To:', 320, metaY);
      doc.font('Helvetica').text(`Name: ${client.personalInfo?.name || payment.clientName}`, 320, metaY + 18);
      doc.text(`Email: ${client.personalInfo?.email || 'N/A'}`, 320, metaY + 32);
      
      const phoneNum = client.personalInfo?.mobileNo || client.personalInfo?.whatsappNumber || 'N/A';
      doc.text(`Phone: ${phoneNum}`, 320, metaY + 46);

      drawLine(235);

      // Table Header
      let tableY = 255;
      doc.fillColor('#f3f4f6')
         .rect(40, tableY, 515, 20)
         .fill();
         
      doc.fillColor('#374151')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Description', 50, tableY + 6)
         .text('Billing Period', 250, tableY + 6, { width: 180, align: 'left' })
         .text('Amount', 430, tableY + 6, { width: 110, align: 'right' });

      // Table Row
      tableY = 280;
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#111827');
      
      // Description (Plan name)
      doc.text(`Membership Plan: ${payment.planName || 'Gym Plan'}`, 50, tableY);
      
      // Billing Period
      let periodStr = 'N/A';
      if (payment.startDate) {
        const start = new Date(payment.startDate);
        
        let endDateObj = null;
        if (client.memberships && Array.isArray(client.memberships)) {
          const matchingMembership = client.memberships.find(m => 
            m.planId?.toString() === payment.planId?.toString() && 
            new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
          );
          if (matchingMembership) endDateObj = matchingMembership.endDate;
        }
        
        if (!endDateObj) {
          // Fallback calculation using duration months
          endDateObj = new Date(start);
          endDateObj.setMonth(endDateObj.getMonth() + (payment.planDurationMonths || 1));
          endDateObj.setDate(endDateObj.getDate() - 1);
        }
        
        const startF = start.toLocaleDateString('en-GB').replace(/\//g, '-');
        const endF = new Date(endDateObj).toLocaleDateString('en-GB').replace(/\//g, '-');
        periodStr = `${startF} to ${endF}`;
      }
      doc.text(periodStr, 250, tableY, { width: 180, align: 'left' });

      // Amount
      const totalAmountVal = payment.invoiceAmount || payment.amount || 0;
      doc.text(`Rs. ${Number(totalAmountVal).toFixed(2)}`, 430, tableY, { width: 110, align: 'right' });

      drawLine(tableY + 25);

      // Financial calculations summary (Bottom Right)
      let summaryY = tableY + 40;
      doc.fontSize(10);
      
      // Total Invoice
      doc.font('Helvetica-Bold').text('Invoice Total:', 320, summaryY);
      doc.font('Helvetica').text(`Rs. ${Number(totalAmountVal).toFixed(2)}`, 430, summaryY, { width: 110, align: 'right' });
      
      // Paid Now
      summaryY += 18;
      doc.font('Helvetica-Bold').text('Amount Paid Now:', 320, summaryY);
      doc.font('Helvetica').text(`Rs. ${Number(payment.paidNow || payment.paidAmount || 0).toFixed(2)}`, 430, summaryY, { width: 110, align: 'right' });

      // Total Paid
      summaryY += 18;
      doc.font('Helvetica-Bold').text('Cumulative Paid:', 320, summaryY);
      doc.font('Helvetica').text(`Rs. ${Number(payment.totalPaid || 0).toFixed(2)}`, 430, summaryY, { width: 110, align: 'right' });

      // Remaining Balance
      summaryY += 18;
      const bal = payment.remainingBalance ?? Math.max(0, totalAmountVal - (payment.totalPaid || 0));
      doc.font('Helvetica-Bold').fillColor(bal > 0 ? '#ef4444' : '#111827').text('Remaining Balance:', 320, summaryY);
      doc.font('Helvetica').text(`Rs. ${Number(bal).toFixed(2)}`, 430, summaryY, { width: 110, align: 'right' });

      // Due Date (if there is balance)
      if (bal > 0 && payment.dueDate) {
        summaryY += 18;
        const dueD = new Date(payment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        doc.font('Helvetica-Bold').fillColor('#ef4444').text('Balance Due Date:', 320, summaryY);
        doc.font('Helvetica').text(dueD, 430, summaryY, { width: 110, align: 'right' });
      }

      // Reset style
      doc.fillColor('#111827');

      // Payment Method Info (Bottom Left)
      let infoY = tableY + 40;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#4b5563').text('PAYMENT METHOD', 40, infoY);
      doc.font('Helvetica').fontSize(10).fillColor('#111827').text(String(payment.paymentMethod || payment.mode || 'cash').toUpperCase(), 40, infoY + 12);

      // Thank You note
      const regardsText = gym.billingInfo?.regards || gym.gymName;
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .text('Thank you for your membership!', 40, 480);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('If you have any questions regarding this receipt, please contact support.', 40, 495);
         
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4b5563')
         .text(`Regards,\n${regardsText}`, 40, 520);

      // Footer brand tag
      doc.fontSize(8)
         .font('Helvetica-Oblique')
         .fillColor('#9ca3af')
         .text('Generated automatically by Gym Platform', 40, 750, { align: 'center' });

      doc.end();
      
      writeStream.on('finish', () => {
        resolve(outputPath);
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = { generatePaymentPDF };

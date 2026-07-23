const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Downloads a remote image and returns a Buffer.
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
};

/**
 * Resolves the logo path or downloads it if it's a URL.
 * @param {string} logoPath 
 * @returns {Promise<string|Buffer|null>}
 */
const getLogoBufferOrPath = async (logoPath) => {
  if (!logoPath) return null;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    try {
      return await downloadImage(logoPath);
    } catch (e) {
      console.error('[PDF SERVICE ERROR] Failed to fetch remote logo image:', e);
      return null;
    }
  } else {
    const fullPath = path.join(__dirname, '..', logoPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    return null;
  }
};

/**
 * Generates an elegant PDF receipt for a recorded payment matching print preview.
 * @param {Object} payment - The payment record
 * @param {Object} client - The client record
 * @param {Object} gym - The gym record
 * @returns {Promise<string>} Path to the generated PDF file
 */
const generatePaymentPDF = async (payment, client, gym) => {
  const logoFile = await getLogoBufferOrPath(gym.gymLogo);

  // Register custom font if available on Windows/Linux to support the Rupee symbol
  let fontName = 'Helvetica';
  let fontBold = 'Helvetica-Bold';
  let fontOblique = 'Helvetica-Oblique';

  const winFont = 'C:\\Windows\\Fonts\\arial.ttf';
  const winFontBold = 'C:\\Windows\\Fonts\\arialbd.ttf';
  const winFontOblique = 'C:\\Windows\\Fonts\\ariali.ttf';

  const hasWinFonts = fs.existsSync(winFont) && fs.existsSync(winFontBold);

  // Fetch description dynamically from Plan model
  let planDescription = 'Premium access to all gym facilities and equipment.';
  if (payment.planId && client && client.db) {
    const PlanModel = client.db.models.Plan || client.db.model('Plan', require('../models/Plan').schema);
    try {
      const planObj = await PlanModel.findById(payment.planId);
      if (planObj && planObj.description) {
        planDescription = planObj.description;
      }
    } catch (e) {
      console.error('Failed to query plan description:', e);
    }
  }

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

      if (hasWinFonts) {
        doc.registerFont('Arial', winFont);
        doc.registerFont('Arial-Bold', winFontBold);
        fontName = 'Arial';
        fontBold = 'Arial-Bold';
        if (fs.existsSync(winFontOblique)) {
          doc.registerFont('Arial-Italic', winFontOblique);
          fontOblique = 'Arial-Italic';
        } else {
          fontOblique = 'Arial';
        }
      }

      const currencySymbol = '₹';

      // Helper: Draw line
      const drawLine = (y) => {
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
      };

      // 1. Header: Gym Logo & Details (Left side) and Status & Invoice Details (Right side)
      if (logoFile) {
        try {
          // Draw logo with rounded corners and light gray border
          doc.save();
          doc.roundedRect(40, 50, 45, 45, 6).clip();
          doc.image(logoFile, 40, 50, { width: 45, height: 45 });
          doc.restore();

          doc.strokeColor('#e5e7eb').lineWidth(1).roundedRect(40, 50, 45, 45, 6).stroke();

          doc.fillColor('#1f2937')
            .fontSize(14)
            .font(fontBold)
            .text(String(gym.gymName).toUpperCase(), 95, 52);
          doc.fontSize(8)
            .fillColor('#4b5563')
            .font(fontBold)
            .text(`GYM ID: ${gym.gymId}`, 95, 68);
        } catch (imgErr) {
          console.error('[PDF SERVICE WARNING] Failed to render image, falling back to text:', imgErr);
          doc.fillColor('#1f2937')
            .fontSize(14)
            .font(fontBold)
            .text(String(gym.gymName).toUpperCase(), 40, 50);
          doc.fontSize(8)
            .fillColor('#4b5563')
            .font(fontBold)
            .text(`GYM ID: ${gym.gymId}`, 40, 68);
        }
      } else {
        // Fallback graphical box with first letter
        doc.fillColor('#f3f4f6')
          .roundedRect(40, 50, 45, 45, 6)
          .fill();
        doc.fillColor('#10b981')
          .font(fontBold)
          .fontSize(18)
          .text((gym.gymName || 'G').charAt(0).toUpperCase(), 40, 63, { width: 45, align: 'center' });

        doc.fillColor('#1f2937')
          .fontSize(14)
          .font(fontBold)
          .text(String(gym.gymName).toUpperCase(), 95, 52);
        doc.fontSize(8)
          .fillColor('#4b5563')
          .font(fontBold)
          .text(`GYM ID: ${gym.gymId}`, 95, 68);
      }

      // Address below details (no tagline)
      const gymAddress = gym.billingInfo?.addressOnBill || gym.address || '';
      if (gymAddress) {
        doc.fontSize(8)
          .font(fontName)
          .fillColor('#4b5563')
          .text(gymAddress, logoFile ? 95 : 40, logoFile ? 78 : 80);
      }

      // Status Badge (Top-Right)
      const status = (payment.status || 'paid').toLowerCase();
      let badgeColor = '#10b981'; // Green for PAID
      let badgeBg = '#e6f7f0';
      let badgeText = 'PAID';
      if (status === 'partial') {
        badgeColor = '#f59e0b'; // Amber
        badgeBg = '#fef3c7';
        badgeText = 'PARTIALLY';
      } else if (status === 'overdue') {
        badgeColor = '#ef4444'; // Red
        badgeBg = '#fee2e2';
        badgeText = 'OVERDUE';
      }

      doc.fillColor(badgeBg)
        .roundedRect(470, 50, 85, 20, 10)
        .fill();
      doc.fillColor(badgeColor)
        .font(fontBold)
        .fontSize(9)
        .text(badgeText, 470, 56, { width: 85, align: 'center' });

      // Invoice Details below Badge (Top-Right)
      doc.fillColor('#111827')
        .font(fontBold)
        .fontSize(10)
        .text(`Invoice #${payment.paymentId}`, 350, 78, { width: 205, align: 'right' });

      const pDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
      const formattedDate = pDate.toLocaleDateString('en-GB').replace(/\//g, '-');
      doc.font(fontName)
        .fillColor('#4b5563')
        .fontSize(9)
        .text(`Date: ${formattedDate}`, 350, 93, { width: 205, align: 'right' });

      drawLine(115);

      // 2. Metadata Blocks: BILLED TO and PAYMENT DETAILS (Side-by-side)
      let metaY = 135;
      const memberSince = client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A';

      // Column 1: BILLED TO
      doc.fontSize(8).fillColor('#9ca3af').font(fontBold).text('BILLED TO', 40, metaY);
      doc.fontSize(10).fillColor('#111827').font(fontBold).text(client.personalInfo?.name || payment.clientName, 40, metaY + 14);
      doc.fontSize(9).fillColor('#4b5563').font(fontName).text(`Client ID: ${client.clientId || 'N/A'}`, 40, metaY + 28);
      doc.text(`Member since: ${memberSince}`, 40, metaY + 40);

      // Column 2: PAYMENT DETAILS
      doc.fontSize(8).fillColor('#9ca3af').font(fontBold).text('PAYMENT DETAILS', 350, metaY, { width: 205, align: 'right' });
      const payMethod = String(payment.paymentMethod || payment.mode || 'cash').toUpperCase();
      doc.fontSize(10).fillColor('#111827').font(fontBold).text(`Method: ${payMethod}`, 350, metaY + 14, { width: 205, align: 'right' });
      const payStatus = status === 'partial' ? 'Installment Plan' : 'Full Payment';
      doc.fontSize(9).fillColor('#4b5563').font(fontName).text(`Status: ${payStatus}`, 350, metaY + 28, { width: 205, align: 'right' });

      // 3. Table Header
      let tableY = 205;
      doc.fontSize(8).fillColor('#9ca3af').font(fontBold).text('MEMBERSHIP DETAILS', 40, tableY);
      doc.text('PERIOD', 250, tableY, { width: 180, align: 'center' });
      doc.text('AMOUNT', 430, tableY, { width: 125, align: 'right' });
      drawLine(tableY + 12);

      // Resolve Billing Period
      let periodStr = 'N/A';
      if (payment.startDate) {
        const start = new Date(payment.startDate);
        let endDateObj = null;
        if (client.memberships && Array.isArray(client.memberships)) {
          const matchingMembership = client.memberships.find(m =>
            (m.planId?._id || m.planId)?.toString() === (payment.planId?._id || payment.planId)?.toString() &&
            new Date(m.startDate).getTime() === new Date(payment.startDate).getTime()
          );
          if (matchingMembership) endDateObj = matchingMembership.endDate;
        }
        if (!endDateObj) {
          endDateObj = new Date(start);
          endDateObj.setMonth(endDateObj.getMonth() + (payment.planDurationMonths || 1));
          endDateObj.setDate(endDateObj.setDate() - 1);
        }
        const startF = start.toLocaleDateString('en-GB').replace(/\//g, '-');
        const endF = new Date(endDateObj).toLocaleDateString('en-GB').replace(/\//g, '-');
        periodStr = `${startF} to ${endF}`;
      }

      // Table Row
      let rowY = tableY + 25;
      const totalAmountVal = payment.invoiceAmount || payment.amount || 0;
      const rowAmountVal = payment.paidNow || payment.paidAmount || 0;

      // Draw rounded container box around the details row
      doc.strokeColor('#e5e7eb')
        .lineWidth(1)
        .roundedRect(40, rowY - 8, 515, 42, 6)
        .stroke();

      doc.font(fontBold).fontSize(10).fillColor('#111827').text(`${payment.planName || 'Monthly'} Subscription`, 50, rowY);
      doc.font(fontName).fontSize(8).fillColor('#6b7280').text(planDescription, 50, rowY + 14, { width: 200 });

      doc.font(fontName).fontSize(9).fillColor('#4b5563').text(periodStr, 250, rowY + 6, { width: 180, align: 'center' });

      doc.font(fontBold).fontSize(10).fillColor('#111827').text(`${currencySymbol}${Number(rowAmountVal).toFixed(2)}`, 430, rowY + 6, { width: 110, align: 'right' });

      // 4. MEMBERSHIP NOTE Box
      const noteText = 'Discipline is the bridge between goals and accomplishment. Thank you for staying dedicated to your fitness journey.';
      let noteY = rowY + 50;

      doc.fillColor('#f9fafb')
        .roundedRect(40, noteY, 515, 45, 6)
        .fill();

      doc.strokeColor('#e5e7eb')
        .lineWidth(1)
        .roundedRect(40, noteY, 515, 45, 6)
        .stroke();

      doc.fillColor('#9ca3af')
        .font(fontBold)
        .fontSize(7)
        .text('MEMBERSHIP NOTE', 50, noteY + 8);

      doc.fillColor('#4b5563')
        .font(fontOblique)
        .fontSize(8)
        .text(`"${noteText}"`, 50, noteY + 18, { width: 495 });

      // 5. Calculations Summary (Full Width - plain black colors)
      let calcY = noteY + 65;

      doc.fontSize(9).fillColor('#4b5563');
      doc.font(fontName).text('Plan Amount', 40, calcY);
      doc.font(fontBold).fillColor('#111827').text(`${currencySymbol}${Number(totalAmountVal).toFixed(2)}`, 430, calcY, { width: 125, align: 'right' });

      calcY += 16;
      doc.font(fontName).fillColor('#4b5563').text('Paid Now', 40, calcY);
      doc.font(fontBold).fillColor('#111827').text(`${currencySymbol}${Number(payment.paidNow || payment.paidAmount || 0).toFixed(2)}`, 430, calcY, { width: 125, align: 'right' });

      calcY += 16;
      doc.fillColor('#4b5563').font(fontName).text('Total Paid', 40, calcY);
      doc.font(fontBold).fillColor('#111827').text(`${currencySymbol}${Number(payment.totalPaid || payment.paidAmount || 0).toFixed(2)}`, 430, calcY, { width: 125, align: 'right' });

      calcY += 14;
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, calcY).lineTo(555, calcY).stroke();

      calcY += 8;
      const bal = payment.remainingBalance ?? Math.max(0, totalAmountVal - (payment.totalPaid || 0));
      doc.font(fontBold).fillColor('#111827').text('Balance Due', 40, calcY);
      doc.font(fontBold).fillColor('#111827').text(`${currencySymbol}${Number(bal).toFixed(2)}`, 430, calcY, { width: 125, align: 'right' });

      if (bal > 0 && payment.dueDate) {
        calcY += 16;
        const dueD = new Date(payment.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        doc.font(fontName).fillColor('#4b5563').text('Due Date', 40, calcY);
        doc.font(fontBold).fillColor('#111827').text(dueD, 430, calcY, { width: 125, align: 'right' });
      }

      // 6. Footer Layout
      let footerY = 480;
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();

      footerY += 15;
      doc.fillColor('#111827')
        .font(fontBold)
        .fontSize(9)
        .text('Thank you for your business!', 40, footerY, { width: 515, align: 'center' });

      footerY += 14;
      doc.font(fontName)
        .fontSize(8)
        .fillColor('#6b7280')
        .text('For any inquiries regarding this invoice or your membership, please reach out to our dedicated support team.', 40, footerY, { width: 515, align: 'center' });

      footerY += 14;
      const contactPhone = gym.billingInfo?.helpContact || gym.gymContact || 'N/A';
      const contactEmail = gym.gymEmail || 'N/A';
      const phoneText = `\u260E  +91 ${contactPhone}`;
      const emailText = `\u2709  ${contactEmail}`;

      doc.font(fontBold)
        .fontSize(8)
        .fillColor('#374151')
        .text(`${phoneText}        ${emailText}`, 40, footerY, { width: 515, align: 'center' });

      footerY += 14;
      const currentYear = new Date().getFullYear();
      const systemName = `${String(gym.gymName).toUpperCase()} MANAGEMENT SYSTEM`;
      doc.font(fontBold)
        .fontSize(7)
        .fillColor('#111827')
        .text(`© ${currentYear} ${systemName}. ALL RIGHTS RESERVED.`, 40, footerY, { width: 515, align: 'center' });

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

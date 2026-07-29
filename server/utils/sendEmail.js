const nodemailer = require('nodemailer');
const dns = require('dns');

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Error sending email: EMAIL_USER or EMAIL_PASS environment variables are missing!');
    throw new Error('Server email configuration is missing (EMAIL_USER or EMAIL_PASS environment variables).');
  }

  try {
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    // secure = true for port 465, false for port 587/25
    const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

    const transportConfig = {
      host,
      port,
      secure,
      requireTLS: port === 587,
      family: 4, // Explicitly force IPv4 to prevent ENETUNREACH on Render's dual-stack container network
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false
      }
    };

    // Only set service if explicitly configured by environment variable
    if (process.env.EMAIL_SERVICE) {
      transportConfig.service = process.env.EMAIL_SERVICE;
    }

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions = {
      from: `Gym Management Platform <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // Race transporter.sendMail with a 10s hard timeout to guarantee no hanging on Render
    const sendMailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`SMTP email dispatch timed out (10s limit). Cloud host (Render) blocked SMTP connection to ${host}:${port}.`));
      }, 10000);
    });

    const info = await Promise.race([sendMailPromise, timeoutPromise]);
    console.log('Email sent successfully: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email: ', error.message);
    throw error;
  }
};

module.exports = sendEmail;

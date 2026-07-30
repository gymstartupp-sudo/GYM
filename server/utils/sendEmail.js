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

    // Resolve hostname to IPv4 address to prevent ENETUNREACH on Render's dual-stack container network
    let resolvedHost = host;
    try {
      const ipAddress = await new Promise((resolve, reject) => {
        dns.lookup(host, { family: 4 }, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      resolvedHost = ipAddress;
      console.log(`Resolved SMTP host ${host} to IPv4: ${resolvedHost}`);
    } catch (dnsErr) {
      console.warn(`DNS lookup failed for ${host}: ${dnsErr.message}. Falling back to original host.`);
    }

    const transportConfig = {
      host: resolvedHost,
      port,
      secure,
      requireTLS: port === 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false,
        servername: host // Crucial for TLS handshake SNI validation when using IP address
      }
    };

    // Only set service if DNS resolution failed (to avoid overriding the IP host configuration)
    if (process.env.EMAIL_SERVICE && resolvedHost === host) {
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

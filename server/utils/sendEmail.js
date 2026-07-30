const sendEmail = async (options) => {
  if (!process.env.BREVO_API_KEY) {
    console.error('Error sending email: BREVO_API_KEY environment variable is missing!');
    throw new Error('Server email configuration is missing (BREVO_API_KEY environment variable).');
  }

  try {
    const senderEmail = process.env.EMAIL_FROM || 'gymstartupp@gmail.com';
    const senderName = process.env.EMAIL_FROM_NAME || 'Gym Platform';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html || options.message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error response from Brevo API');
    }
    console.log('Email sent successfully via Brevo API: ' + data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email via Brevo: ', error.message);
    throw error;
  }
};

module.exports = sendEmail;

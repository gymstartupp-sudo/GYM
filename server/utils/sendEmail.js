const sendEmail = async (options) => {
  if (!process.env.RESEND_API_KEY) {
    console.error('Error sending email: RESEND_API_KEY environment variable is missing!');
    throw new Error('Server email configuration is missing (RESEND_API_KEY environment variable).');
  }

  try {
    const from = process.env.EMAIL_FROM || 'Gym Platform <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Error response from Resend API');
    }
    console.log('Email sent successfully via Resend API: ' + data.id);
    return data;
  } catch (error) {
    console.error('Error sending email via Resend: ', error.message);
    throw error;
  }
};

module.exports = sendEmail;

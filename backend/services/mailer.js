const nodemailer = require('nodemailer');

/**
 * Creates and returns a configured Nodemailer transporter.
 * Uses Gmail with an App Password (set in .env).
 * If email env vars are missing, returns null so the app
 * still works without email (just won't send notifications).
 */
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Mailer] EMAIL_USER or EMAIL_PASS not set — email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends an email notification to Sammy when a new message arrives.
 * @param {{ name: string, email: string, message: string, source: string }} data
 */
const sendNotificationEmail = async (data) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const sourceLabel = data.source === 'chat' ? '💬 Chat Widget' : '📬 Contact Form';

  const mailOptions = {
    from: `"Portfolio Bot" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `[Portfolio] New message from ${data.name} via ${sourceLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #0f3460); padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0;">📨 New Portfolio Message</h2>
          <p style="color: #a0a0c0; margin: 4px 0 0;">Via ${sourceLabel}</p>
        </div>
        <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 80px;">Name:</td>
              <td style="padding: 8px 0; color: #212529;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
              <td style="padding: 8px 0;">
                <a href="mailto:${data.email}" style="color: #0f3460;">${data.email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #495057; vertical-align: top;">Message:</td>
              <td style="padding: 8px 0; color: #212529; white-space: pre-wrap;">${data.message}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #dee2e6;">
            <a href="mailto:${data.email}?subject=Re: Your message on my portfolio"
               style="background: #0f3460; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
              Reply to ${data.name}
            </a>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #868e96;">
            Sent: ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Douala' })} (WAT)
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Notification sent to ${process.env.NOTIFICATION_EMAIL}`);
  } catch (err) {
    // Log the error but don't let it break the API response
    console.error('[Mailer] Failed to send notification email:', err.message);
  }
};

module.exports = { sendNotificationEmail };

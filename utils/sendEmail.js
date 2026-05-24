const nodemailer = require('nodemailer');

/**
 * Sends an email using SMTP configuration.
 * Hardened to catch internal errors and log them without crashing the caller.
 * This function is designed to be called without 'await' for non-blocking execution.
 */
const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const fromName = process.env.FROM_NAME || 'Titan Strength';
    const fromEmail = process.env.FROM_EMAIL;

    const message = {
      from: `${fromName} <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      html: options.message
    };

    const info = await transporter.sendMail(message);
    console.log('Background Email Sent: %s', info.messageId);
  } catch (error) {
    // Log error but do not throw, as this is used in non-blocking background calls
    console.error('❌ Background Email Error:', error.message || error);
  }
};

module.exports = sendEmail;

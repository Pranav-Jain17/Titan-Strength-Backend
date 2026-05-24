const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1. Create the transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // 2. Define the message using the options passed in
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.message 
    };

    // 3. Send the email and log success
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    
  } catch (error) {
    // 4. Catch any errors and log them to your Render dashboard
    console.error("🚨 REAL BREVO ERROR:", error); 
    throw new Error("Verification email could not be sent");
  }
};

module.exports = sendEmail;
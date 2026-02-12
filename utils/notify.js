const Notification = require('../models/notification');
const sendEmail = require('./sendEmail');
const User = require('../models/user');

const notify = async ({ userId, title, message, type = 'info', sendMail = false }) => {
  try {
    await Notification.create({
      recipient: userId,
      title,
      message,
      type,
      isRead: false,
      readAt: null
    });

    if (sendMail) {
      const user = await User.findById(userId).select('email name');
      if (user && user.email) {
        const safeTitle = String(title || '').trim() || 'Notification';
        const htmlMessage = typeof message === 'string' ? message : String(message);

        await sendEmail({
          email: user.email,
          subject: `Titan Strength: ${safeTitle}`,
          message: htmlMessage
        });
      }
    }
  } catch (err) {
    // Never crash the request path due to notifications
    // eslint-disable-next-line no-console
    console.error('Notification Error:', err?.message || err);
  }
};

module.exports = notify;

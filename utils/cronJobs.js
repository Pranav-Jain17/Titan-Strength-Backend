const cron = require('node-cron');

const ClassSession = require('../models/classSession');
const ClassAttendance = require('../models/classAttendance');
const notify = require('./notify');

const scheduleClassReminders = () => {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('Running Class Reminder Check...');

      const now = new Date();
      const from = new Date(now.getTime() + 55 * 60 * 1000);
      const to = new Date(now.getTime() + 65 * 60 * 1000);

      const upcomingSessions = await ClassSession.find({
        status: 'scheduled',
        startTime: { $gte: from, $lte: to }
      }).select('title startTime');

      if (!upcomingSessions.length) return;

      const sessionIds = upcomingSessions.map((s) => s._id);
      const sessionById = new Map(upcomingSessions.map((s) => [String(s._id), s]));

      const bookings = await ClassAttendance.find({
        classSession: { $in: sessionIds },
        status: { $in: ['booked', 'present'] }
      })
        .populate('user', 'email name')
        .select('user classSession');

      for (const record of bookings) {
        const user = record.user;
        if (!user?._id) continue;

        const session = sessionById.get(String(record.classSession));
        const title = session?.title ? String(session.title) : 'Class';

        await notify({
          userId: user._id,
          title: 'Class Reminder',
          message: `Your ${title} class starts in 1 hour!`,
          type: 'warning',
          sendMail: true
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Cron Job Error (Class Reminder):', err?.message || err);
    }
  });
};

module.exports = { scheduleClassReminders };

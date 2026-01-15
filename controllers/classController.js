const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const User = require('../models/user');
const ClassSession = require('../models/classSession');
const ClassAttendance = require('../models/classAttendance');

const countReservedForClass = async (classSessionId) => {
  return ClassAttendance.countDocuments({
    classSession: classSessionId,
    status: { $in: ['booked', 'present'] }
  });
};

// @desc    Public weekly timetable
// @route   GET /api/v1/classes/schedule
// @access  Public
exports.getSchedule = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const sessions = await ClassSession.find({
    status: 'scheduled',
    startTime: { $gte: now, $lte: end }
  })
    .sort('startTime')
    .populate('trainer', 'name email');

  const ids = sessions.map((s) => s._id);
  const counts = await ClassAttendance.aggregate([
    {
      $match: {
        classSession: { $in: ids },
        status: { $in: ['booked', 'present'] }
      }
    },
    {
      $group: {
        _id: '$classSession',
        reserved: { $sum: 1 }
      }
    }
  ]);

  const reservedMap = new Map(counts.map((c) => [String(c._id), c.reserved]));

  const data = sessions.map((s) => {
    const reserved = reservedMap.get(String(s._id)) || 0;
    const available = Math.max((s.capacity || 0) - reserved, 0);
    return {
      classId: String(s._id),
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      capacity: s.capacity,
      reserved,
      available,
      trainer: s.trainer
    };
  });

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

// @desc    Book a class slot
// @route   POST /api/v1/classes/:id/book
// @access  Private (Member)
exports.bookClass = asyncHandler(async (req, res, next) => {
  const session = await ClassSession.findById(req.params.id);
  if (!session) return next(new AppError('Class not found', 404));
  if (session.status !== 'scheduled') return next(new AppError('Class is not available for booking', 400));
  if (session.startTime && session.startTime.getTime() < Date.now()) {
    return next(new AppError('Cannot book a past class', 400));
  }

  const existing = await ClassAttendance.findOne({
    classSession: session._id,
    user: req.user.id
  });

  if (existing && existing.status !== 'absent') {
    return res.status(200).json({
      success: true,
      message: 'Already booked',
      data: existing
    });
  }

  const reserved = await countReservedForClass(session._id);
  if (reserved >= (session.capacity || 0)) {
    return next(new AppError('Class is full', 400));
  }

  const record = await ClassAttendance.findOneAndUpdate(
    { classSession: session._id, user: req.user.id },
    {
      classSession: session._id,
      user: req.user.id,
      status: 'booked'
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(201).json({
    success: true,
    data: record
  });
});

// @desc    Cancel a class booking
// @route   DELETE /api/v1/classes/:id/cancel
// @access  Private (Member)
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const record = await ClassAttendance.findOne({
    classSession: req.params.id,
    user: req.user.id
  });

  if (!record) {
    return res.status(200).json({
      success: true,
      message: 'No booking found to cancel'
    });
  }

  await record.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Booking cancelled'
  });
});

// @desc    Create a new class slot
// @route   POST /api/v1/classes
// @access  Private (Manager/Owner)
exports.createClass = asyncHandler(async (req, res, next) => {
  const { title, description, startTime, endTime, trainerId, capacity } = req.body;

  if (!title || !startTime) {
    return next(new AppError('Please provide title and startTime', 400));
  }

  let trainer = null;
  if (trainerId) {
    trainer = await User.findById(trainerId);
    if (!trainer) return next(new AppError('Trainer not found', 404));
    if (trainer.role !== 'trainer') return next(new AppError('Selected user is not a trainer', 400));
  }

  const session = await ClassSession.create({
    title,
    description: description || '',
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    trainer: trainer ? trainer._id : null,
    capacity: capacity || 20,
    status: 'scheduled',
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: session
  });
});

// @desc    Update a class slot
// @route   PUT /api/v1/classes/:id
// @access  Private (Manager/Owner)
exports.updateClass = asyncHandler(async (req, res, next) => {
  const session = await ClassSession.findById(req.params.id);
  if (!session) return next(new AppError('Class not found', 404));

  const { title, description, startTime, endTime, trainerId, capacity, status } = req.body;

  if (title !== undefined) session.title = title;
  if (description !== undefined) session.description = description;
  if (startTime !== undefined) session.startTime = new Date(startTime);
  if (endTime !== undefined) session.endTime = endTime ? new Date(endTime) : null;
  if (capacity !== undefined) session.capacity = capacity;
  if (status !== undefined) {
    const allowed = ['scheduled', 'cancelled'];
    if (!allowed.includes(status)) return next(new AppError(`Invalid status. Use: ${allowed.join(', ')}`, 400));
    session.status = status;
  }

  if (trainerId !== undefined) {
    if (!trainerId) {
      session.trainer = null;
    } else {
      const trainer = await User.findById(trainerId);
      if (!trainer) return next(new AppError('Trainer not found', 404));
      if (trainer.role !== 'trainer') return next(new AppError('Selected user is not a trainer', 400));
      session.trainer = trainer._id;
    }
  }

  await session.save();

  res.status(200).json({
    success: true,
    data: session
  });
});

// @desc    Get attendance list for a class
// @route   GET /api/v1/classes/attendance/:id
// @access  Private (Manager/Owner)
exports.getClassAttendance = asyncHandler(async (req, res, next) => {
  const session = await ClassSession.findById(req.params.id);
  if (!session) return next(new AppError('Class not found', 404));

  const attendance = await ClassAttendance.find({ classSession: session._id })
    .populate('user', 'name email role')
    .sort('-updatedAt');

  res.status(200).json({
    success: true,
    class: session,
    count: attendance.length,
    data: attendance
  });
});

// @desc    Mark a member present for a class
// @route   POST /api/v1/classes/attendance/mark
// @access  Private (Manager/Owner)
exports.markClassAttendance = asyncHandler(async (req, res, next) => {
  const { classId, userId, status } = req.body;
  const safeStatus = status || 'present';
  const allowed = ['booked', 'present', 'absent'];

  if (!classId || !userId) {
    return next(new AppError('Please provide classId and userId', 400));
  }
  if (!allowed.includes(safeStatus)) {
    return next(new AppError(`Invalid status. Use: ${allowed.join(', ')}`, 400));
  }

  const session = await ClassSession.findById(classId);
  if (!session) return next(new AppError('Class not found', 404));

  const user = await User.findById(userId);
  if (!user) return next(new AppError('User not found', 404));

  const record = await ClassAttendance.findOneAndUpdate(
    { classSession: session._id, user: user._id },
    {
      classSession: session._id,
      user: user._id,
      status: safeStatus,
      markedBy: req.user.id,
      markedAt: new Date()
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    data: record
  });
});

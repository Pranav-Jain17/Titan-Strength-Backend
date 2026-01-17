const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  getTrainerDashboard,
  getTrainerSchedule,
  getTrainerClassAttendees,
  getTrainerClients,
  getTrainerClientProfile,
  createClientProgress,
  getClientProgress,
  assignDietToClient,
  assignWorkoutToClient
} = require('../controllers/trainerController');

const router = express.Router();

router.use(protect);
router.use(authorize('trainer'));

// 1) Dashboard
router.get('/dashboard', getTrainerDashboard);

// 2) Schedule
router.get('/schedule', getTrainerSchedule);
router.get('/schedule/:classId/attendees', getTrainerClassAttendees);

// 3) Clients
router.get('/clients', getTrainerClients);
router.get('/clients/:userId', getTrainerClientProfile);

// 4) Progress
router.post('/clients/:userId/progress', createClientProgress);
router.get('/clients/:userId/progress', getClientProgress);

// 5) Content assignment
router.post('/clients/:userId/assign-diet', assignDietToClient);
router.post('/clients/:userId/assign-workout', assignWorkoutToClient);

module.exports = router;

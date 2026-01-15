const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  checkIn,
  getLiveAttendance,
  getMembers,
  getMemberProfile,
  addEquipment,
  reportMaintenance,
  updateMaintenanceStatus,
  getTrainers,
  assignTrainerToMember
} = require('../controllers/managerController');

const router = express.Router();

router.use(protect);
router.use(authorize('manager', 'owner'));

// Daily operations
router.post('/check-in', checkIn);
router.get('/attendance/live', getLiveAttendance);
router.get('/members', getMembers);
router.get('/members/:id', getMemberProfile);

// Equipment & maintenance
router.post('/equipment', addEquipment);
router.post('/maintenance/report', reportMaintenance);
router.put('/maintenance/:id/status', updateMaintenanceStatus);

// Trainers
router.get('/trainers', getTrainers);
router.post('/trainers/assign-client', assignTrainerToMember);

module.exports = router;

const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  checkIn,
  checkOut,
  getLiveAttendance,
  getMembers,
  getMemberProfile,
  addEquipment,
  getEquipment,
  updateEquipment,
  deleteEquipment,
  reportMaintenance,
  updateMaintenanceStatus,
  getTrainers,
  getUsers,
  getBranches,
  createTrainer,
  assignTrainerToBranch,
  assignTrainerToMember
} = require('../controllers/managerController');

const { getManagers } = require('../controllers/ownerController');

const router = express.Router();

router.use(protect);
router.use(authorize('manager', 'owner'));

// Daily operations
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/attendance/live', getLiveAttendance);
router.get('/members', getMembers);
router.get('/members/:id', getMemberProfile);

// Equipment & maintenance
router.get('/equipment', getEquipment);
router.post('/equipment', addEquipment);
router.put('/equipment/:id', updateEquipment);
router.delete('/equipment/:id', deleteEquipment);
router.post('/maintenance/report', reportMaintenance);
router.put('/maintenance/:id/status', updateMaintenanceStatus);

// Lists (for dropdowns)
router.get('/users', getUsers);
router.get('/managers', authorize('owner'), getManagers);
router.get('/branches', getBranches);

// Trainers
router.get('/trainers', getTrainers);
router.post('/trainers', createTrainer);
router.put('/trainers/:id/assign-branch', assignTrainerToBranch);
router.post('/trainers/assign-client', assignTrainerToMember);

module.exports = router;

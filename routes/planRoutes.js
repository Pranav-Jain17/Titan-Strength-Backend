const express = require('express');
const { 
  getPlans, 
  getPlan, 
  createPlan, 
  updatePlan, 
  deletePlan 
} = require('../controllers/planController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getPlans);

router.route('/:id')
  .get(getPlan);

router.use(protect);
router.use(authorize('owner'));

router.route('/')
  .post(createPlan);

router.route('/:id')
  .put(updatePlan)
  .delete(deletePlan);

module.exports = router;
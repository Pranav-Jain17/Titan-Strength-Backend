const express = require('express');
const {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch
} = require('../controllers/branchController');

const router = express.Router();

console.log('Branch Routes file is loading...');

// Middleware to protect routes below
const { protect, authorize } = require('../middleware/auth');

router.route('/').get(getBranches);
router.route('/:id').get(getBranch);
router.use(protect);

router.route('/')
  .post(authorize('owner'), createBranch); 

router.route('/:id')
  .put(authorize('owner', 'manager'), updateBranch) 
  .delete(authorize('owner'), deleteBranch); 

module.exports = router;
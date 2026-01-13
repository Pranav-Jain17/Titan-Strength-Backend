const express = require('express');
const { getUsers, getUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 1. Protect all routes (Someone must be logged in)
router.use(protect);

// 2. Restrict to Owners and Managers only (Regular members shouldn't see this list)
router.use(authorize('owner', 'manager'));

router.route('/')
  .get(getUsers); // URL: /api/v1/users

router.route('/:id')
  .get(getUser);  // URL: /api/v1/users/:id

module.exports = router;
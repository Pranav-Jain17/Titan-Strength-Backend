const express = require('express');
const { getUsers, getUser, uploadAvatar, getMyAvatar, deleteMyAvatar } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/fileUpload');

const router = express.Router();

router.use(protect);

router.get('/avatar', getMyAvatar);
router.put('/avatar', uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteMyAvatar);
// Backward compatible: previously used POST for upload/update
router.post('/avatar', uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.use(authorize('owner', 'manager'));

router.route('/')
  .get(getUsers); // URL: /api/v1/users

router.route('/:id')
  .get(getUser);  // URL: /api/v1/users/:id

module.exports = router;
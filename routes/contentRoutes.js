const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const { getVideos, getDiets, getMyDietPlan } = require('../controllers/contentController');

const router = express.Router();

router.use(protect);
router.use(authorize('member'));

router.get('/videos', getVideos);
router.get('/diets', getDiets);
router.get('/diets/my-plan', getMyDietPlan);

module.exports = router;

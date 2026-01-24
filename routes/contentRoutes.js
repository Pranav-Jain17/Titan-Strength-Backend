const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');

const {
	getVideos,
	createVideo,
	getDiets,
	getMyDietPlan,
	getMyWorkoutPlan
} = require('../controllers/contentController');

const router = express.Router();

router.use(protect);

// Library content (trainer can browse to assign; member can browse)
router.get('/videos', authorize('member', 'trainer'), getVideos);
router.post('/videos', authorize('trainer'), upload.single('videoFile'), createVideo);

router.get('/diets', authorize('member', 'trainer'), getDiets);

// Personalized content (member)
router.get('/diets/my-plan', authorize('member'), getMyDietPlan);
router.get('/workouts/my-plan', authorize('member'), getMyWorkoutPlan);

module.exports = router;

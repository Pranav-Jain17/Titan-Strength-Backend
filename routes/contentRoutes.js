const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');

const {
	getVideos,
	createVideo,
	updateVideo,
	deleteVideo,
	getDiets,
	getMyDietPlan,
	getMyWorkoutPlan
} = require('../controllers/contentController');

const router = express.Router();

router.use(protect);

router.get('/videos', authorize('member', 'trainer'), getVideos);
router.post('/videos', authorize('trainer'), upload.single('videoFile'), createVideo);
router.put('/videos/:id', authorize('trainer'), upload.single('videoFile'), updateVideo);
router.delete('/videos/:id', authorize('trainer'), deleteVideo);

router.get('/diets', authorize('member', 'trainer'), getDiets);

router.get('/diets/my-plan', authorize('member'), getMyDietPlan);
router.get('/workouts/my-plan', authorize('member'), getMyWorkoutPlan);

module.exports = router;

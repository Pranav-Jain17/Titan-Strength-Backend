const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'private', 
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      // Create a unique filename: videos/1739283-workout.mp4
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `videos/${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  // Limit file size to 100MB
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Not a video! Please upload a video file.'), false);
    }
  }
});
module.exports = { upload, s3 };
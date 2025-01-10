const express = require('express');
const { verifyFace } = require('../controllers/faceController');
const upload = require('../middleware/multerMiddleware');

const router = express.Router();

router.post('/verify-face', upload.single('file'), verifyFace);

module.exports = router;

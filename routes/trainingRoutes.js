const express = require('express');
const { uploadFiles } = require('../controllers/trainingController');
const upload = require('../middleware/multerMiddleware');

const router = express.Router();

router.post('/upload-files', upload.array('files', 4), uploadFiles);

module.exports = router;

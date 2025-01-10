const faceapi = require('face-api.js');
const canvas = require('canvas');

let faceMatcher;

const setFaceMatcher = (matcher) => {
    faceMatcher = matcher;
};

const verifyFace = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('Không có file ảnh được tải lên!');
        }

        const image = await canvas.loadImage(req.file.buffer);
        const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

        if (!detections.length) {
            return res.status(404).send('Không tìm thấy khuôn mặt nào!');
        }

        const matchedNames = detections.map(detection =>
            faceMatcher.findBestMatch(detection.descriptor).label
        );

        res.status(200).json({ names: matchedNames });
    } catch (error) {
        console.error('Lỗi trong quá trình xác thực khuôn mặt:', error);
        res.status(500).send('Đã xảy ra lỗi trong quá trình xử lý.');
    }
};

module.exports = { verifyFace, setFaceMatcher };

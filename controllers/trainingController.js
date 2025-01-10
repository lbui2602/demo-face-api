const faceapi = require('face-api.js');
const canvas = require('canvas');
const FaceModel = require('../models/FaceModel');
const { setFaceMatcher: setFaceMatcherFace } = require('./faceController');

let trainedData = [];
let faceMatcher;

const saveTrainingDataToDB = async (labeledFaceDescriptor) => {
    const { label, descriptors } = labeledFaceDescriptor;
    const descriptorsArray = descriptors.map((desc) => Array.from(desc));

    // Lưu hoặc cập nhật dữ liệu vào MongoDB
    await FaceModel.findOneAndUpdate(
        { label },
        { label, descriptors: descriptorsArray },
        { upsert: true, new: true }
    );
};

const setFaceMatcher = (matcher) => {
    faceMatcher = matcher;
};

const loadTrainingDataForLabel = async (label, images) => {
    const descriptors = [];

    for (const imageBuffer of images) {
        try {
            const image = await canvas.loadImage(imageBuffer);
            const detection = await faceapi
                .detectSingleFace(image)
                .withFaceLandmarks()
                .withFaceDescriptor();
            if (detection) {
                descriptors.push(detection.descriptor);
            }
        } catch (error) {
            console.error(`Lỗi khi xử lý ảnh của ${label}:`, error);
        }
    }

    return new faceapi.LabeledFaceDescriptors(label, descriptors);
};

const uploadFiles = async (req, res) => {
    try {
        const { name } = req.body;
        const files = req.files;

        if (!name || !files || files.length !== 4) {
            return res.status(400).send('Vui lòng cung cấp tên và đúng 4 file ảnh.');
        }

        // Xử lý dữ liệu huấn luyện từ bộ nhớ
        const imageBuffers = files.map((file) => file.buffer);
        const newTrainingData = await loadTrainingDataForLabel(name, imageBuffers);

        // Lưu dữ liệu vào MongoDB
        await saveTrainingDataToDB(newTrainingData);

        // Cập nhật dữ liệu đã huấn luyện và tạo faceMatcher mới
        trainedData.push(newTrainingData);
        faceMatcher = new faceapi.FaceMatcher(trainedData, 0.6);
        setFaceMatcherFace(faceMatcher);

        res.status(200).send('Upload và huấn luyện dữ liệu mới thành công!');
    } catch (error) {
        console.error('Lỗi khi upload file:', error);
        res.status(500).send(`Đã xảy ra lỗi: ${error.message}`);
    }
};

module.exports = { uploadFiles, setFaceMatcher, loadTrainingDataForLabel, trainedData };

const express = require('express');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Routes
const faceRoutes = require('./routes/faceRoutes');
const trainingRoutes = require('./routes/trainingRoutes');

// Models
const FaceModel = require('./models/FaceModel');

// Controllers
const { setFaceMatcher: setFaceMatcherFace } = require('./controllers/faceController');
const { setFaceMatcher: setFaceMatcherTraining, trainedData } = require('./controllers/trainingController');

const app = express();
const port = 3000;

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true
})
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Cấu hình Canvas cho FaceAPI
faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image: canvas.Image, ImageData: canvas.ImageData });

// Đường dẫn mô hình và dữ liệu
const modelsPath = path.join(__dirname, 'models');

// Hàm tải dữ liệu huấn luyện từ MongoDB
const loadTrainingDataFromDB = async () => {
    try {
        const faces = await FaceModel.find();
        return faces.map((face) => {
            const descriptors = face.descriptors.map((desc) => new Float32Array(desc));
            return new faceapi.LabeledFaceDescriptors(face.label, descriptors);
        });
    } catch (err) {
        console.error('Lỗi khi tải dữ liệu từ MongoDB:', err);
        return [];
    }
};

// Hàm tải các mô hình nhận diện
async function initModels() {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
        console.log('Mô hình nhận diện đã được tải xong.');
    } catch (err) {
        console.error('Lỗi khi tải các mô hình nhận diện:', err);
    }
}

// Hàm khởi tạo ứng dụng
async function init() {
    await initModels();

    // Lấy dữ liệu từ MongoDB
    const faceDescriptorsFromDB = await loadTrainingDataFromDB();

    if (faceDescriptorsFromDB.length === 0) {
        console.warn('Không có dữ liệu huấn luyện trong MongoDB.');
    }

    // Gán dữ liệu đã huấn luyện
    trainedData.splice(0, trainedData.length, ...faceDescriptorsFromDB);
    console.log('Dữ liệu huấn luyện đã được tải:', trainedData);

    // Tạo FaceMatcher nếu có dữ liệu
    if (trainedData.length > 0) {
        const faceMatcher = new faceapi.FaceMatcher(trainedData, 0.6);
        setFaceMatcherFace(faceMatcher);
        setFaceMatcherTraining(faceMatcher);
        console.log('FaceMatcher đã được khởi tạo.');
    } else {
        console.warn('FaceMatcher không được khởi tạo do thiếu dữ liệu.');
    }
}

// Khởi chạy ứng dụng
init();

// Routes
app.use('/api/face', faceRoutes);
app.use('/api/training', trainingRoutes);

// Lắng nghe server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

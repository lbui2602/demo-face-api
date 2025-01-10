const mongoose = require('mongoose');

// Schema cho dữ liệu khuôn mặt
const faceSchema = new mongoose.Schema({
    label: { type: String, required: true },
    descriptors: [[Number]], // Lưu descriptor dưới dạng mảng số
});

const FaceModel = mongoose.model('Face', faceSchema);

module.exports = FaceModel;

const express = require('express');
const multer = require('multer');
const path = require('path');
const faceapi = require('face-api.js');
const canvas = require('canvas');

const app = express();
const port = 3000;

// Cấu hình lưu trữ file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Kết nối canvas của face-api.js với Node.js
faceapi.env.monkeyPatch({ Canvas: canvas.Canvas, Image: canvas.Image, ImageData: canvas.ImageData });

// Đường dẫn đến mô hình và dữ liệu huấn luyện
const modelsPath = path.join(__dirname, 'models');
const trainingDataPath = path.join(__dirname, 'data');
app.get('/', (req, res) => {
    res.send('Chào mừng bạn đến với API Express cơ bản!');
});

// Route lấy thông tin người dùng
app.get('/users', (req, res) => {
    const users = [
        { id: 1, name: 'Nguyen Van A' },
        { id: 2, name: 'Le Thi B' },
    ];
    res.json(users);
});

// Load dữ liệu huấn luyện và mô hình nhận diện khuôn mặt
async function loadTrainingData() {
  const labels = ["Fukada Eimi", "Rina Ishihara", "Takizawa Laura", "Yua Mikami"];
  const faceDescriptors = [];
  for (const label of labels) {
    const descriptors = [];
    for (let i = 1; i <= 4; i++) {
      const imagePath = path.join(trainingDataPath, label, `${i}.jpeg`);
      const image = await canvas.loadImage(imagePath);
      const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
      if (detection) {
        descriptors.push(detection.descriptor);
      }
    }
    faceDescriptors.push(new faceapi.LabeledFaceDescriptors(label, descriptors));
  }
  return faceDescriptors;
}

// Khởi tạo mô hình nhận diện khuôn mặt
let faceMatcher;
async function init() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);

  const trainingData = await loadTrainingData();
  faceMatcher = new faceapi.FaceMatcher(trainingData, 0.6);
  console.log('Mô hình nhận diện đã được tải xong.');
}

init();

// API xác thực khuôn mặt
app.post('/verify-face', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Không có file ảnh được tải lên!');
    }

    // Sử dụng canvas.loadImage để tải hình ảnh từ buffer
    const image = await canvas.loadImage(req.file.buffer);
    const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

    if (!detections.length) {
      return res.status(404).send('Không tìm thấy khuôn mặt nào!');
    }

    // Vẽ hộp và xác thực khuôn mặt
    const canvasResult = canvas.createCanvas(image.width, image.height);
    const ctx = canvasResult.getContext('2d');
    ctx.drawImage(image, 0, 0);

    for (const detection of detections) {
      const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
      const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
        label: `${bestMatch.toString()}`
      });
      drawBox.draw(canvasResult);
    }

    // Chuyển đổi canvas thành ảnh và trả về cho client
    const resultImage = canvasResult.toBuffer('image/jpeg');
    res.set('Content-Type', 'image/jpeg');
    res.send(resultImage);
  } catch (err) {
    console.error('Lỗi trong quá trình xác thực khuôn mặt:', err);
    res.status(500).send('Đã xảy ra lỗi trong quá trình xử lý.');
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});

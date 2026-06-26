import multer from 'multer';
import fs from 'fs';

// Configure multer storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Dynamically verify and generate the uploads folder if it is missing
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
    }
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size limit: 10 MB
});

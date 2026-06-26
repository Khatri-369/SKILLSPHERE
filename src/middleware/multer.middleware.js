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

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`File upload failed. Invalid file type: '${file.mimetype}'. Only images, PDFs, text, and doc/docx files are allowed.`);
    error.statusCode = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size limit: 10 MB
});

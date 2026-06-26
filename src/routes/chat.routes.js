import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/multer.middleware.js';
import { getChatHistory, uploadChatImage } from '../controllers/chat.controller.js';

const router = Router();

// Secure all chat endpoints
router.use(verifyJWT);

// Retrieve conversation history
router.get('/history/:userId', getChatHistory);

// Upload a single chat image attachment
router.post('/upload-image', upload.single('image'), uploadChatImage);

export default router;

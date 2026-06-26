import Message from '../models/message.model.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

/**
 * Fetch Chat History (One-to-One Conversation)
 * GET /api/v1/chat/history/:userId
 */
export const getChatHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Fetch messages where:
    // (sender = A and receiver = B) OR (sender = B and receiver = A)
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email avatar')
      .populate('receiver', 'name email avatar');

    // Count total messages for pagination metadata
    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: {
        messages: messages.reverse(), // Revert to chronological order for client view
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload Chat Attachment Image
 * POST /api/v1/chat/upload-image
 */
export const uploadChatImage = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No image file provided');
      error.statusCode = 400;
      return next(error);
    }

    // Upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(req.file.path);
    if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
      const error = new Error('Failed to upload image to Cloudinary');
      error.statusCode = 500;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: cloudinaryResponse.secure_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

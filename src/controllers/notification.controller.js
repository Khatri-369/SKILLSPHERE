import Notification from '../models/notification.model.js';
import { sendNotification } from '../services/notification.service.js';

/**
 * Fetch Paginated Notifications for current logged-in user
 * GET /api/v1/notifications
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    // Fetch recipient's notifications, newest first
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email avatar');

    const total = await Notification.countDocuments({ recipient: userId });

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
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
 * Fetch Unread Notifications Count
 * GET /api/v1/notifications/unread-count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({ recipient: userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Unread notification count retrieved successfully',
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific notification as Read
 * PATCH /api/v1/notifications/:notificationId/read
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      return next(error);
    }

    // Verify ownership
    if (notification.recipient.toString() !== userId.toString()) {
      const error = new Error('Access denied. You do not own this notification.');
      error.statusCode = 403;
      return next(error);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read successfully',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all recipient notifications as Read
 * PATCH /api/v1/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read successfully',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger / Send Notification (Admin / Testing API)
 * POST /api/v1/notifications
 */
export const triggerNotification = async (req, res, next) => {
  try {
    const { recipientId, type, title, message, referenceId, referenceModel } = req.body;
    const senderId = req.user._id;

    if (!recipientId || !type || !title || !message) {
      const error = new Error('Recipient ID, type, title, and message are required');
      error.statusCode = 400;
      return next(error);
    }

    const notification = await sendNotification({
      recipientId,
      senderId,
      type,
      title,
      message,
      referenceId,
      referenceModel,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification dispatched successfully',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  triggerNotification,
} from '../controllers/notification.controller.js';

const router = Router();

// Secure all notification endpoints
router.use(verifyJWT);

// Retrieve user notifications (paginated)
router.get('/', getMyNotifications);

// Retrieve unread count
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.patch('/read-all', markAllNotificationsAsRead);

// Mark single notification as read
router.patch('/:notificationId/read', markNotificationAsRead);

// Send / Trigger a notification (Admin / System dispatch)
router.post('/', triggerNotification);

export default router;

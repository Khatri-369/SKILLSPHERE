import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import { sendRealTimeNotification } from '../sockets/index.js';
import { sendEmail } from '../utils/mail.js';

/**
 * Creates and dispatches a multi-channel notification (DB, Real-time WebSockets, and Email)
 * @param {object} params - Notification parameters
 * @returns {Promise<object>} Created notification document
 */
export const sendNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  referenceId,
  referenceModel,
}) => {
  try {
    // 1. Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new Error('Recipient user not found');
    }

    // 2. Create persistent notification in DB
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      referenceId,
      referenceModel,
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email');

    // 3. Dispatch real-time WebSocket alert
    sendRealTimeNotification(recipientId, populatedNotification);

    // 4. Dispatch async email notification
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #6366f1; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">SkillSphere Notification</h2>
        <p>Hello <strong>${recipient.name}</strong>,</p>
        <p>You have a new update on your SkillSphere account:</p>
        <div style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #1f2937;">${title}</h3>
          <p style="margin-bottom: 0; color: #4b5563; font-size: 15px; line-height: 1.5;">${message}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Please log in to your dashboard to review this activity and respond.</p>
        <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">This email was sent automatically by SkillSphere. Please do not reply directly.</p>
      </div>
    `;

    // Fire email in background to prevent blocking logic
    sendEmail({
      email: recipient.email,
      subject: `SkillSphere: ${title}`,
      html: emailHtml,
    }).catch((err) => {
      console.error('Failed to send email notification:', err.message);
    });

    return populatedNotification;
  } catch (error) {
    console.error('Error in sendNotification service:', error);
    throw error;
  }
};

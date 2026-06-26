import { Server } from 'socket.io';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';
import jsonwebtoken from 'jsonwebtoken';
import config from '../config/index.js';

let io;
const onlineUsers = new Map(); // userId -> socketId

/**
 * Initialize Socket.io Server
 * @param {object} httpServer - Node HTTP server instance
 * @returns {object} Server instance
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin || '*',
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      // Token can be passed in auth object or query params
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication failed. Access token is required.'));
      }

      // Verify JWT
      const decoded = jsonwebtoken.verify(token, config.accessTokenSecret);
      
      // Verify user exists in database
      const user = await User.findById(decoded._id).select('-password');
      if (!user) {
        return next(new Error('Authentication failed. User not found.'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      return next(new Error('Authentication failed. Invalid access token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    console.log(`🔌 Socket Connected: User ${userId} on socket ${socket.id}`);

    // Broadcast updated list of online user IDs
    io.emit('online_users', Array.from(onlineUsers.keys()));

    /**
     * Event: send_message
     * Emitted by clients to send a direct message
     */
    socket.on('send_message', async (data, callback) => {
      try {
        const { receiverId, content, attachments } = data;

        if (!receiverId || (!content && (!attachments || attachments.length === 0))) {
          if (callback) {
            callback({ success: false, error: 'Receiver ID and content/attachments are required' });
          }
          return;
        }

        // Save message to database
        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          content: content || '',
          attachments: attachments || [],
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email avatar')
          .populate('receiver', 'name email avatar');

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', populatedMessage);
        }

        // Return status and saved message details to sender
        if (callback) {
          callback({ success: true, message: populatedMessage });
        }
      } catch (error) {
        console.error('Error in send_message event:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Event: typing
     * Emitted by clients when typing/stopping typing
     */
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing_status', {
          senderId: userId,
          isTyping: !!isTyping,
        });
      }
    });

    /**
     * Event: read_messages
     * Emitted by clients to mark messages as read
     */
    socket.on('read_messages', async (data, callback) => {
      try {
        const { senderId } = data; // the user who sent the messages being read

        if (!senderId) {
          if (callback) callback({ success: false, error: 'Sender ID is required' });
          return;
        }

        // Mark messages as read in database
        const result = await Message.updateMany(
          { sender: senderId, receiver: userId, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        );

        // Notify original sender of the read receipt
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read_receipt', {
            readerId: userId,
          });
        }

        if (callback) {
          callback({ success: true, count: result.modifiedCount });
        }
      } catch (error) {
        console.error('Error in read_messages event:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Event: disconnect
     * Clean up online mapping and broadcast update
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Socket Disconnected: User ${userId} (${socket.id})`);
      onlineUsers.delete(userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

/**
 * Helper to fetch the initialized Socket.io Server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized.');
  }
  return io;
};

/**
 * Send real-time notification to a specific user if they are online
 * @param {string} userId - Recipient User ID
 * @param {object} notification - Notification document details
 */
export const sendRealTimeNotification = (userId, notification) => {
  if (!io) return;
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('new_notification', notification);
    console.log(`🔔 [REAL-TIME NOTIFICATION] Sent to user ${userId} on socket ${socketId}`);
  }
};

import fs from 'fs';
import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Notification from '../src/models/notification.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const NOTIFY_URL = 'http://localhost:5000/api/v1/notifications';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, assertion) => {
  if (assertion) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.log(`❌ FAIL: ${testName}`);
  }
};

async function runTests() {
  console.log('Connecting to database to monitor notification records...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old notification test users
  const testEmailPrefix = 'notify_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Recipient User (Freelancer)
  const recipientData = {
    name: 'Notification Alice',
    email: `${testEmailPrefix}recipient_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Recipient: ${recipientData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipientData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  let token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const loginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: recipientData.email, password: recipientData.password })
  });
  const loginBody = await loginRes.json();
  const tokenAlice = loginBody.data.accessToken;
  const idAlice = loginBody.data.user._id;

  // 2. Setup Sender User (Client)
  const senderData = {
    name: 'Notification Bob',
    email: `${testEmailPrefix}sender_${randomNum}@example.com`,
    password: 'password123',
    role: 'Client'
  };
  console.log(`Registering Sender: ${senderData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(senderData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const senderLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: senderData.email, password: senderData.password })
  });
  const senderLogin = await senderLoginRes.json();
  const idBob = senderLogin.data.user._id;

  console.log('\nUsers created. Connecting Recipient socket...');

  // 3. Connect Recipient Socket
  const socketAlice = io('http://localhost:5000', {
    auth: { token: tokenAlice }
  });

  // Verify online event first
  await new Promise((resolve) => {
    socketAlice.on('online_users', (list) => {
      if (list.includes(idAlice)) {
        logResult('Websocket: Recipient Alice is online', true);
        resolve();
      }
    });
    setTimeout(() => {
      resolve();
    }, 2000);
  });

  // 4. Trigger Notification Dispatch (acting as backend logic calling the service)
  console.log('\nDispatching new notification via REST API (triggering Socket + Email)...');
  let notificationId = '';

  const socketPromise = new Promise((resolve) => {
    socketAlice.on('new_notification', (notif) => {
      logResult('Websocket receive: Alice received real-time notification via Socket.io', 
        notif.recipient._id === idAlice && notif.type === 'ProposalAccepted' && notif.title === 'Proposal Accepted!'
      );
      resolve();
    });
  });

  await fetch(NOTIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenAlice}`
    },
    body: JSON.stringify({
      recipientId: idAlice,
      type: 'ProposalAccepted',
      title: 'Proposal Accepted!',
      message: 'Congratulations! Your proposal for Dashboard Dev was accepted.'
    })
  });

  await socketPromise;

  // 5. Query Unread count (Expect 1)
  try {
    const res = await fetch(`${NOTIFY_URL}/unread-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`
      }
    });
    const body = await res.json();
    logResult('REST getUnreadCount: Alice has 1 unread notification', 
      body.success && body.data.unreadCount === 1
    );
  } catch (err) {
    console.error('Fetch unread-count failed:', err);
  }

  // 6. Query Notifications List
  try {
    const res = await fetch(`${NOTIFY_URL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`
      }
    });
    const body = await res.json();
    logResult('REST getMyNotifications: Alice successfully retrieved list containing the notification', 
      body.success && body.data.notifications.length === 1 && body.data.notifications[0].title === 'Proposal Accepted!'
    );
    if (body.success && body.data.notifications.length > 0) {
      notificationId = body.data.notifications[0]._id;
    }
  } catch (err) {
    console.error('Fetch notifications list failed:', err);
  }

  // 7. Mark single notification as read
  if (notificationId) {
    try {
      const res = await fetch(`${NOTIFY_URL}/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${tokenAlice}`
        }
      });
      const body = await res.json();
      logResult('REST markNotificationAsRead: Alice marked notification as read successfully', 
        body.success && body.data.isRead === true
      );
    } catch (err) {
      console.error('Mark as read failed:', err);
    }
  }

  // 8. Re-query Unread count (Expect 0)
  try {
    const res = await fetch(`${NOTIFY_URL}/unread-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`
      }
    });
    const body = await res.json();
    logResult('REST getUnreadCount: Alice unread count decreased to 0', 
      body.success && body.data.unreadCount === 0
    );
  } catch (err) {
    console.error('Re-fetching unread-count failed:', err);
  }

  // 9. Clean up and Disconnect
  console.log('\nCleaning up databases and disconnecting sockets...');
  socketAlice.disconnect();

  await Notification.deleteMany({ recipient: idAlice });
  await User.deleteMany({ _id: { $in: [idAlice, idBob] } });
  await mongoose.connection.close();
  console.log('Database connection closed.');
}

runTests();

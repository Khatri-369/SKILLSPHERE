import fs from 'fs';
import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Message from '../src/models/message.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const CHAT_URL = 'http://localhost:5000/api/v1/chat';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, assertion) => {
  if (assertion) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.log(`❌ FAIL: ${testName}`);
  }
};

async function runTests() {
  console.log('Connecting to database to monitor testing setup...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old chat test users
  const testEmailPrefix = 'chat_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup User Alice (Freelancer)
  const aliceData = {
    name: 'Chat Alice',
    email: `${testEmailPrefix}alice_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Alice: ${aliceData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(aliceData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  let token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const aliceLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: aliceData.email, password: aliceData.password })
  });
  const aliceLogin = await aliceLoginRes.json();
  const tokenAlice = aliceLogin.data.accessToken;
  const idAlice = aliceLogin.data.user._id;

  // 2. Setup User Bob (Client)
  const bobData = {
    name: 'Chat Bob',
    email: `${testEmailPrefix}bob_${randomNum}@example.com`,
    password: 'password123',
    role: 'Client'
  };
  console.log(`Registering Bob: ${bobData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bobData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const bobLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: bobData.email, password: bobData.password })
  });
  const bobLogin = await bobLoginRes.json();
  const tokenBob = bobLogin.data.accessToken;
  const idBob = bobLogin.data.user._id;

  console.log('\nUsers created. Connecting parallel clients to Socket.io...');

  // 3. Connect Alice and Bob sockets
  const socketAlice = io('http://localhost:5000', {
    auth: { token: tokenAlice }
  });

  const socketBob = io('http://localhost:5000', {
    auth: { token: tokenBob }
  });

  // Verify online list broadcasts
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      logResult('Websocket: Alice and Bob are flagged in the online list', false);
      resolve();
    }, 4000);

    socketBob.on('online_users', (list) => {
      if (list.includes(idAlice) && list.includes(idBob)) {
        clearTimeout(timer);
        logResult('Websocket: Alice and Bob are flagged in the online list', true);
        resolve();
      }
    });
  });

  // 4. Test direct messaging: Alice sends a message to Bob
  const messagePromise = new Promise((resolve) => {
    socketBob.on('receive_message', (msg) => {
      logResult('Websocket receive_message: Bob received Alice\'s message in real-time', 
        msg.sender._id === idAlice && msg.content === 'Hello Bob! This is Alice.'
      );
      resolve();
    });
  });

  socketAlice.emit('send_message', {
    receiverId: idBob,
    content: 'Hello Bob! This is Alice.'
  }, (response) => {
    logResult('Websocket send_message: Alice sent message successfully (acknowledged)', response.success);
  });

  await messagePromise;

  // 5. Test typing indicator: Alice starts typing
  const typingPromise = new Promise((resolve) => {
    socketBob.on('typing_status', (data) => {
      logResult('Websocket typing_status: Bob received Alice\'s typing indicator', 
        data.senderId === idAlice && data.isTyping === true
      );
      resolve();
    });
  });

  socketAlice.emit('typing', {
    receiverId: idBob,
    isTyping: true
  });

  await typingPromise;

  // 6. Test read receipts: Bob reads Alice's message
  const readPromise = new Promise((resolve) => {
    socketAlice.on('messages_read_receipt', (data) => {
      logResult('Websocket read_receipt: Alice received Bob\'s read receipt', 
        data.readerId === idBob
      );
      resolve();
    });
  });

  socketBob.emit('read_messages', {
    senderId: idAlice
  }, (ack) => {
    logResult('Websocket read_messages: Bob marked messages as read (acknowledged)', ack.success);
  });

  await readPromise;

  // 7. Verify Database state: message should be updated as isRead = true
  const savedMsg = await Message.findOne({ sender: idAlice, receiver: idBob });
  logResult('Database: Alice\'s message is updated to isRead = true', savedMsg && savedMsg.isRead === true);

  // 8. Test REST Chat History Endpoint
  try {
    const res = await fetch(`${CHAT_URL}/history/${idBob}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`
      }
    });
    const body = await res.json();
    logResult('REST Endpoint: Alice retrieved conversation history with Bob successfully', 
      body.success && body.data.messages.length === 1 && body.data.messages[0].content === 'Hello Bob! This is Alice.'
    );
  } catch (err) {
    console.error('Fetch history failed:', err);
  }

  // 9. Test REST Chat Image Upload
  try {
    const formData = new FormData();
    const mockImageBlob = new Blob(['mock binary image content'], { type: 'image/png' });
    formData.append('image', mockImageBlob, 'chat_attachment.png');

    const res = await fetch(`${CHAT_URL}/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenAlice}`
      },
      body: formData
    });
    const body = await res.json();
    logResult('REST Endpoint: Alice uploaded attachment image successfully', 
      body.success && body.data.url.includes('chat_attachment.png')
    );
  } catch (err) {
    console.error('Image upload failed:', err);
  }

  // 10. Clean up and Disconnect
  console.log('\nCleaning up databases and disconnecting sockets...');
  socketAlice.disconnect();
  socketBob.disconnect();

  await Message.deleteMany({ sender: { $in: [idAlice, idBob] } });
  await User.deleteMany({ _id: { $in: [idAlice, idBob] } });
  await mongoose.connection.close();
  console.log('Database connection closed.');
}

runTests();

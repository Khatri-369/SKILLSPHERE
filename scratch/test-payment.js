import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import Payment from '../src/models/payment.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const PAY_URL = 'http://localhost:5000/api/v1/payments';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database for seeding payment test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old payment test users
  const testEmailPrefix = 'pay_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Client User
  const clientData = {
    name: 'Payment Client',
    email: `${testEmailPrefix}client_${randomNum}@example.com`,
    password: 'password123',
    role: 'Client'
  };
  console.log(`Registering Client: ${clientData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  let token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const clientLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientData.email, password: clientData.password })
  });
  const clientLogin = await clientLoginRes.json();
  const tokenClient = clientLogin.data.accessToken;

  // 2. Setup Freelancer User
  const freelancerData = {
    name: 'Payment Freelancer',
    email: `${testEmailPrefix}freelancer_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Freelancer: ${freelancerData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freelancerData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const freelancerLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freelancerData.email, password: freelancerData.password })
  });
  const freelancerLogin = await freelancerLoginRes.json();
  const idFreelancer = freelancerLogin.data.user._id;

  // 3. Publish a Gig as Client with Milestones
  console.log('Publishing Gig with Milestone...');
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenClient}`
    },
    body: JSON.stringify({
      title: 'Glassmorphic dashboard matching payment test',
      description: 'Build a gorgeous checkout UI in dashboard layout.',
      budget: 500,
      category: 'Web Dev',
      deadline: '2026-10-31',
      status: 'Published',
      milestones: [
        { title: 'Milestone 1: Prototype', description: 'Scaffold basic HTML wireframes', amount: 200 },
        { title: 'Milestone 2: Finish UI', description: 'Write CSS and clean styling', amount: 300 }
      ]
    })
  });
  const gigBody = await gigRes.json();
  const gig = gigBody.data;
  const milestone1Id = gig.milestones[0]._id;
  const milestone2Id = gig.milestones[1]._id;

  let payment1Id = '';
  let order1Id = '';
  let order2Id = '';

  // ==========================================
  // PAYMENT LIFECYCLE TESTS
  // ==========================================

  // Test A: Create milestone order (Expect 201)
  try {
    const res = await fetch(`${PAY_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        milestoneId: milestone1Id,
        recipientId: idFreelancer
      })
    });
    const body = await res.json();
    logResult('Create Milestone Payment Order (Expect 201)', res, body);
    if (body.success) {
      payment1Id = body.data._id;
      order1Id = body.data.razorpayOrderId;
    }
  } catch (err) {
    console.error(err);
  }

  // Test B: Verify payment signature (Expect 200, status: Paid)
  try {
    const res = await fetch(`${PAY_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        razorpayOrderId: order1Id,
        razorpayPaymentId: `pay_mock_${Date.now()}`,
        razorpaySignature: 'mock_signature_string_here'
      })
    });
    const body = await res.json();
    logResult('Verify Signature & Capture Payment (Expect 200, status: Paid)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test C: Refund Payment (Expect 200, status: Refunded)
  try {
    const res = await fetch(`${PAY_URL}/${payment1Id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        reason: 'Client cancelled prototype requirement.'
      })
    });
    const body = await res.json();
    logResult('Refund Paid Milestone (Expect 200, status: Refunded)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test D: Create Second order (to test webhook verification capture)
  try {
    const res = await fetch(`${PAY_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        milestoneId: milestone2Id,
        recipientId: idFreelancer
      })
    });
    const body = await res.json();
    logResult('Create Second Order (Expect 201)', res, body);
    if (body.success) {
      order2Id = body.data.razorpayOrderId;
    }
  } catch (err) {
    console.error(err);
  }

  // Test E: Simulate Razorpay Webhook Event `payment.captured` (Expect 200)
  try {
    const mockPaymentId = `pay_mock_${Date.now()}_99`;
    const res = await fetch(`${PAY_URL}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'mock_webhook_signature'
      },
      body: JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: mockPaymentId,
              order_id: order2Id,
              status: 'captured'
            }
          }
        }
      })
    });
    console.log(`\n--- Test: Webhook payment.captured simulated ---`);
    console.log(`Status: ${res.status}`);
    const textRes = await res.text();
    console.log(`Body: ${textRes}`);
    
    // Verify that the second payment status updated to Paid in DB
    const dbPayment2 = await Payment.findOne({ razorpayOrderId: order2Id });
    console.log(`Database verification for webhook capture status: ${dbPayment2 ? dbPayment2.status : 'Not Found'} (Expect Paid)`);
  } catch (err) {
    console.error(err);
  }

  // Test F: Retrieve Payment History (Expect 200, contains both payments)
  try {
    const res = await fetch(`${PAY_URL}/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenClient}`
      }
    });
    const body = await res.json();
    logResult('Get Payment History List (Expect 200, length: 2)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Cleanup Database
  console.log('\nCleaning up databases...');
  const userIds = [clientLogin.data.user._id, idFreelancer];
  await Gig.findByIdAndDelete(gig._id);
  await Payment.deleteMany({ sender: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  
  await mongoose.connection.close();
  console.log('Database connection closed.');
  console.log('\nAll Payment Module tests completed.');
}

runTests();

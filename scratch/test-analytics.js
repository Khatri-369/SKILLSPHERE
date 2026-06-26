import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import Payment from '../src/models/payment.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const PROPOSALS_URL = 'http://localhost:5000/api/v1/proposals';
const FREELANCERS_URL = 'http://localhost:5000/api/v1/freelancers';
const ANALYTICS_URL = 'http://localhost:5000/api/v1/analytics';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database for seeding analytics test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old analytics test users
  const testEmailPrefix = 'ana_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Client User
  const clientData = {
    name: 'Analytics Client',
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
  const idClient = clientLogin.data.user._id;

  // 2. Setup Freelancer User
  const freelancerData = {
    name: 'Analytics Freelancer',
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
  const tokenFreelancer = freelancerLogin.data.accessToken;
  const idFreelancer = freelancerLogin.data.user._id;

  // 3. Create Freelancer Profile
  console.log('Creating Freelancer Profile...');
  const profileRes = await fetch(FREELANCERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenFreelancer}`
    },
    body: JSON.stringify({
      skills: ['Python', 'Django'],
      skillLevel: 'Expert',
      hourlyRate: 90,
      languages: ['English']
    })
  });
  const profileBody = await profileRes.json();
  console.log('Profile Created Status:', profileRes.status);

  // 4. Publish Gig as Client
  console.log('Publishing Gig...');
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenClient}`
    },
    body: JSON.stringify({
      title: 'Analytics timeline creation contract',
      description: 'Implement charting data streams.',
      budget: 1200,
      category: 'Web Dev',
      deadline: '2026-11-30',
      status: 'Published',
      milestones: [
        { title: 'Milestone 1', description: 'Scaffolding', amount: 1200 }
      ]
    })
  });
  const gigBody = await gigRes.json();
  const gig = gigBody.data;

  // 5. Submit Proposal as Freelancer
  console.log('Submitting Proposal...');
  const proposalRes = await fetch(PROPOSALS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenFreelancer}`
    },
    body: JSON.stringify({
      gigId: gig._id,
      bidAmount: 1200,
      estimatedTime: '4 days',
      description: 'I can build this analytics timeline.'
    })
  });
  const proposalBody = await proposalRes.json();
  const proposal = proposalBody.data;

  // 6. Client accepts proposal (hiring verified)
  console.log('Accepting Proposal...');
  await fetch(`${PROPOSALS_URL}/${proposal._id}/accept`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${tokenClient}` }
  });

  // 7. Seed Paid Payment for Earnings/Spend timeline check
  console.log('Seeding Paid Payment transaction...');
  await Payment.create({
    sender: idClient,
    recipient: idFreelancer,
    gig: gig._id,
    milestoneId: gig.milestones[0]._id,
    amount: 1200,
    currency: 'INR',
    razorpayOrderId: `ord_${Date.now()}`,
    razorpayPaymentId: `pay_${Date.now()}`,
    status: 'Paid'
  });

  // 8. Publicly read Freelancer Profile 3 times (expect profileViews to be 3)
  console.log('Simulating public profile visits...');
  await fetch(`${FREELANCERS_URL}/${idFreelancer}`);
  await fetch(`${FREELANCERS_URL}/${idFreelancer}`);
  await fetch(`${FREELANCERS_URL}/${idFreelancer}`);

  // ==========================================
  // ANALYTICS MODULE TESTS
  // ==========================================

  // Test A: Get Client Analytics (Expect 200)
  try {
    const res = await fetch(`${ANALYTICS_URL}/client`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenClient}` }
    });
    const body = await res.json();
    logResult('Get Client Analytics (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test B: Get Freelancer Analytics (Expect 200)
  try {
    const res = await fetch(`${ANALYTICS_URL}/freelancer`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenFreelancer}` }
    });
    const body = await res.json();
    logResult('Get Freelancer Analytics (Expect 200, profileViews: 3)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Cleanup Database
  console.log('\nCleaning up databases...');
  const userIds = [idClient, idFreelancer];
  await Gig.findByIdAndDelete(gig._id);
  await Proposal.deleteMany({ freelancer: { $in: userIds } });
  await Payment.deleteMany({ sender: { $in: userIds } });
  await FreelancerProfile.deleteMany({ owner: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  await mongoose.connection.close();
  console.log('Database connection closed.');
  console.log('\nAll Analytics Module tests completed.');
}

runTests();

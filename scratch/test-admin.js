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
const ADMIN_URL = 'http://localhost:5000/api/v1/admin';
const FREELANCERS_URL = 'http://localhost:5000/api/v1/freelancers';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database for seeding admin test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old admin test users
  const testEmailPrefix = 'adm_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Admin User
  const adminData = {
    name: 'Admin User',
    email: `${testEmailPrefix}admin_${randomNum}@example.com`,
    password: 'password123',
    role: 'Admin'
  };
  console.log(`Registering Admin: ${adminData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  let token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const adminLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminData.email, password: adminData.password })
  });
  const adminLogin = await adminLoginRes.json();
  const tokenAdmin = adminLogin.data.accessToken;

  // 2. Setup Client User
  const clientData = {
    name: 'Admin Client Target',
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
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const clientLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientData.email, password: clientData.password })
  });
  const clientLogin = await clientLoginRes.json();
  const tokenClient = clientLogin.data.accessToken;
  const idClient = clientLogin.data.user._id;

  // 3. Setup Freelancer User
  const freelancerData = {
    name: 'Admin Freelancer Target',
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

  // 3.1 Create Freelancer Profile
  console.log('Creating Freelancer Profile...');
  const profileRes = await fetch(FREELANCERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenFreelancer}`
    },
    body: JSON.stringify({
      skills: ['Vue', 'Express'],
      skillLevel: 'Expert',
      hourlyRate: 75,
      languages: ['English']
    })
  });
  const profileBody = await profileRes.json();
  const profileId = profileBody.data._id;

  // 4. Publish a Gig as Client
  console.log('Publishing Gig...');
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenClient}`
    },
    body: JSON.stringify({
      title: 'Admin Dashboard Layout Integration',
      description: 'Implement responsive admin control views.',
      budget: 1500,
      category: 'Web Dev',
      deadline: '2026-11-30',
      status: 'Published',
      milestones: [
        { title: 'Milestone 1', description: 'Scaffolding', amount: 1500 }
      ]
    })
  });
  const gigBody = await gigRes.json();
  const gigId = gigBody.data._id;

  // ==========================================
  // ADMIN DASHBOARD TESTS
  // ==========================================

  // Test A: Get all users list (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const body = await res.json();
    logResult('Get All Users (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test B: Suspend User (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/users/${idClient}/suspend`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ isSuspended: true })
    });
    const body = await res.json();
    logResult('Suspend User Account (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test C: Verify suspension blocks requests and login
  try {
    // Attempting API query with suspended user's token
    const apiRes = await fetch(GIGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({ title: 'Invalid' })
    });
    const apiBody = await apiRes.json();
    console.log(`\n--- Test: Request with Suspended Token (Expect 403) ---`);
    console.log(`Status: ${apiRes.status}`);
    console.log(`Body:`, JSON.stringify(apiBody, null, 2));

    // Attempting login with suspended user credentials
    const loginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientData.email, password: clientData.password })
    });
    const loginBody = await loginRes.json();
    console.log(`\n--- Test: Login with Suspended Credentials (Expect 403) ---`);
    console.log(`Status: ${loginRes.status}`);
    console.log(`Body:`, JSON.stringify(loginBody, null, 2));
  } catch (err) {
    console.error(err);
  }

  // Test D: Unsuspend User (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/users/${idClient}/suspend`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ isSuspended: false })
    });
    const body = await res.json();
    logResult('Unsuspend User Account (Expect 200)', res, body);

    // Verify login is allowed again
    const loginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clientData.email, password: clientData.password })
    });
    console.log(`Unsuspend Re-Login status: ${loginRes.status} (Expect 200)`);
  } catch (err) {
    console.error(err);
  }

  // Test E: Get all gigs list (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/gigs`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const body = await res.json();
    logResult('Get All Gigs (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test F: Toggle Gig Approval status (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/gigs/${gigId}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ isApproved: false })
    });
    const body = await res.json();
    logResult('Toggle Gig Approval Status (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test G: Verify Freelancer badge status (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/freelancers/${profileId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ verificationBadge: true })
    });
    const body = await res.json();
    logResult('Verify Freelancer Profile (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test H: Retrieve Dashboard and Charts Analytics (Expect 200)
  try {
    const res = await fetch(`${ADMIN_URL}/analytics`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const body = await res.json();
    logResult('Get Admin Analytics & Charts Timeline (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Cleanup Database
  console.log('\nCleaning up databases...');
  const userIds = [adminLogin.data.user._id, idClient, idFreelancer];
  await Gig.findByIdAndDelete(gigId);
  await Proposal.deleteMany({ freelancer: { $in: userIds } });
  await Payment.deleteMany({ sender: { $in: userIds } });
  await FreelancerProfile.deleteMany({ owner: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  await mongoose.connection.close();
  console.log('Database connection closed.');
  console.log('\nAll Admin Module tests completed.');
}

runTests();

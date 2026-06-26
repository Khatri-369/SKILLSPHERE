import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import Dispute from '../src/models/dispute.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const PROPOSALS_URL = 'http://localhost:5000/api/v1/proposals';
const DISPUTES_URL = 'http://localhost:5000/api/v1/disputes';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database for seeding dispute test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old dispute test users
  const testEmailPrefix = 'disp_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Admin User
  const adminData = {
    name: 'Dispute Admin',
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
    name: 'Dispute Client',
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
    name: 'Dispute Freelancer',
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

  // 4. Setup Unhired Third User
  const thirdData = {
    name: 'Dispute Unhired Third',
    email: `${testEmailPrefix}third_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Third User: ${thirdData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thirdData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const thirdLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: thirdData.email, password: thirdData.password })
  });
  const thirdLogin = await thirdLoginRes.json();
  const tokenThird = thirdLogin.data.accessToken;

  // 5. Publish Gig as Client
  console.log('Publishing Gig...');
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenClient}`
    },
    body: JSON.stringify({
      title: 'Dispute management development contract',
      description: 'Implement evidence dispute resolutions.',
      budget: 1000,
      category: 'Web Dev',
      deadline: '2026-11-30',
      status: 'Published',
      milestones: [
        { title: 'Milestone 1', description: 'Scaffolding', amount: 1000 }
      ]
    })
  });
  const gigBody = await gigRes.json();
  const gig = gigBody.data;

  // 6. Submit Proposal as Freelancer
  console.log('Submitting Proposal...');
  const proposalRes = await fetch(PROPOSALS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenFreelancer}`
    },
    body: JSON.stringify({
      gigId: gig._id,
      bidAmount: 1000,
      estimatedTime: '6 days',
      description: 'I can implement this dispute module.'
    })
  });
  const proposalBody = await proposalRes.json();
  const proposal = proposalBody.data;

  // 7. Client accepts proposal (Hiring connection created)
  console.log('Accepting Proposal...');
  await fetch(`${PROPOSALS_URL}/${proposal._id}/accept`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${tokenClient}` }
  });

  let dispute1Id = '';
  let dispute2Id = '';

  // ==========================================
  // DISPUTE LIFECYCLE TESTS
  // ==========================================

  // Test A: Raise Dispute as Client (Expect 201)
  try {
    const res = await fetch(DISPUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        title: 'Work not delivered on time',
        description: 'The freelancer has not submitted the milestone files yet.'
      })
    });
    const body = await res.json();
    logResult('Raise Dispute as Client (Expect 201)', res, body);
    if (body.success) {
      dispute1Id = body.data._id;
    }
  } catch (err) {
    console.error(err);
  }

  // Test B: Attempt Duplicate Open Dispute (Expect 400)
  try {
    const res = await fetch(DISPUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        title: 'Work delay',
        description: 'Duplicate description.'
      })
    });
    const body = await res.json();
    logResult('Block Duplicate Open Dispute (Expect 400)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test C: Attempt Dispute by Unhired User (Expect 403)
  try {
    const res = await fetch(DISPUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenThird}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        title: 'Unrelated dispute',
        description: 'Third user trying to raise dispute.'
      })
    });
    const body = await res.json();
    logResult('Block Unhired User Dispute (Expect 403)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test D: Retrieve own disputes for Freelancer (Expect 200)
  try {
    const res = await fetch(`${DISPUTES_URL}/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenFreelancer}` }
    });
    const body = await res.json();
    logResult('Get Freelancer Own Disputes (Expect 200, length: 1)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test E: Close own dispute (Expect 200, status: Closed)
  try {
    const res = await fetch(`${DISPUTES_URL}/${dispute1Id}/close`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${tokenClient}` }
    });
    const body = await res.json();
    logResult('Close Own Dispute (Expect 200, status: Closed)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test F: Admin Resolves Dispute (Expect 200, status: Resolved)
  try {
    // 1. Client raises a new dispute since the previous one is Closed
    const createRes = await fetch(DISPUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        title: 'Second dispute: Quality issues',
        description: 'Files delivered are completely empty.'
      })
    });
    const createBody = await createRes.json();
    dispute2Id = createBody.data._id;

    // 2. Admin resolves it
    const resolveRes = await fetch(`${DISPUTES_URL}/${dispute2Id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        status: 'Resolved',
        resolutionNotes: 'Evidence verified. Payment refunded 100% to Client.'
      })
    });
    const resolveBody = await resolveRes.json();
    logResult('Admin Resolve Dispute (Expect 200, status: Resolved)', resolveRes, resolveBody);
  } catch (err) {
    console.error(err);
  }

  // Test G: Admin lists all disputes (Expect 200)
  try {
    const res = await fetch(DISPUTES_URL, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const body = await res.json();
    logResult('Admin Get All Disputes (Expect 200, length: 2)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Cleanup Database
  console.log('\nCleaning up databases...');
  const userIds = [adminLogin.data.user._id, idClient, idFreelancer, thirdLogin.data.user._id];
  await Gig.findByIdAndDelete(gig._id);
  await Proposal.deleteMany({ freelancer: { $in: userIds } });
  await Dispute.deleteMany({ raisedBy: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  await mongoose.connection.close();
  console.log('Database connection closed.');
  console.log('\nAll Dispute Module tests completed.');
}

runTests();

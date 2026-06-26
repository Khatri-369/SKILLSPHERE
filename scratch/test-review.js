import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import Review from '../src/models/review.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const PROPOSALS_URL = 'http://localhost:5000/api/v1/proposals';
const FREELANCERS_URL = 'http://localhost:5000/api/v1/freelancers';
const REVIEWS_URL = 'http://localhost:5000/api/v1/reviews';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database for seeding review test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old review test users
  const testEmailPrefix = 'rev_test_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  const randomNum = Math.floor(Math.random() * 1000000);

  // 1. Setup Client User
  const clientData = {
    name: 'Review Client',
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
    name: 'Review Freelancer',
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

  // 2.1 Create Freelancer Profile (to verify average ratings propagation)
  console.log('Creating Freelancer Profile...');
  const profileRes = await fetch(FREELANCERS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenFreelancer}`
    },
    body: JSON.stringify({
      skills: ['React', 'Node.js'],
      skillLevel: 'Intermediate',
      hourlyRate: 50,
      languages: ['English']
    })
  });
  const profileBody = await profileRes.json();
  console.log('Profile Created Status:', profileRes.status);

  // 3. Setup Unhired Freelancer User
  const unhiredData = {
    name: 'Review Unhired',
    email: `${testEmailPrefix}unhired_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Unhired Freelancer: ${unhiredData.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(unhiredData)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);

  const unhiredLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unhiredData.email, password: unhiredData.password })
  });
  const unhiredLogin = await unhiredLoginRes.json();
  const idUnhiredFreelancer = unhiredLogin.data.user._id;

  // 4. Publish a Gig as Client
  console.log('Publishing Gig...');
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenClient}`
    },
    body: JSON.stringify({
      title: 'Review test gig layout',
      description: 'Build a review module for freelancer rating system.',
      budget: 800,
      category: 'Web Dev',
      deadline: '2026-12-31',
      status: 'Published',
      milestones: [
        { title: 'Milestone 1', description: 'Basic setup', amount: 800 }
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
      bidAmount: 800,
      estimatedTime: '5 days',
      description: 'I can build this review module perfectly.'
    })
  });
  const proposalBody = await proposalRes.json();
  const proposal = proposalBody.data;

  // 6. Client accepts proposal (Hiring contract verification setup)
  console.log('Accepting Proposal to create verified connection...');
  await fetch(`${PROPOSALS_URL}/${proposal._id}/accept`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${tokenClient}`
    }
  });

  // ==========================================
  // REVIEW TESTS
  // ==========================================

  // Test A: Create verified review for Freelancer by Client (Expect 201)
  try {
    const res = await fetch(REVIEWS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        reviewedUserId: idFreelancer,
        rating: 5,
        comment: 'Outstanding freelancer, highly recommended!'
      })
    });
    const body = await res.json();
    logResult('Create Review for Freelancer by Client (Expect 201)', res, body);

    // Verify rating propagation on the Freelancer Profile
    const profile = await FreelancerProfile.findOne({ owner: idFreelancer });
    console.log(`Database profile check: rating=${profile ? profile.rating : 'N/A'} (Expect 5), reviewsCount=${profile ? profile.reviewsCount : 'N/A'} (Expect 1)`);
  } catch (err) {
    console.error(err);
  }

  // Test B: Attempt duplicate review (Expect 400)
  try {
    const res = await fetch(REVIEWS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        reviewedUserId: idFreelancer,
        rating: 4,
        comment: 'Attempting duplicate review.'
      })
    });
    const body = await res.json();
    logResult('Prevent Duplicate Review (Expect 400)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test C: Attempt unverified review for unhired freelancer (Expect 403)
  try {
    const res = await fetch(REVIEWS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenClient}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        reviewedUserId: idUnhiredFreelancer,
        rating: 5,
        comment: 'They did not do any work but reviewing anyway.'
      })
    });
    const body = await res.json();
    logResult('Block Unverified Review for Unhired Freelancer (Expect 403)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test D: Create verified review for Client by Freelancer (Expect 201)
  try {
    const res = await fetch(REVIEWS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenFreelancer}`
      },
      body: JSON.stringify({
        gigId: gig._id,
        reviewedUserId: idClient,
        rating: 4,
        comment: 'Great client, clear specs and fast verification.'
      })
    });
    const body = await res.json();
    logResult('Create Review for Client by Freelancer (Expect 201)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test E: Get reviews history for Freelancer (Expect 200)
  try {
    const res = await fetch(`${REVIEWS_URL}/user/${idFreelancer}`, {
      method: 'GET'
    });
    const body = await res.json();
    logResult('Get User Reviews History (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test F: Get Review Analytics for Freelancer (Expect 200, averageRating: 5, totalReviews: 1)
  try {
    const res = await fetch(`${REVIEWS_URL}/analytics/${idFreelancer}`, {
      method: 'GET'
    });
    const body = await res.json();
    logResult('Get Review Analytics (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Cleanup Database
  console.log('\nCleaning up databases...');
  const userIds = [idClient, idFreelancer, idUnhiredFreelancer];
  await Gig.findByIdAndDelete(gig._id);
  await Proposal.deleteMany({ freelancer: { $in: userIds } });
  await Review.deleteMany({ reviewer: { $in: userIds } });
  await FreelancerProfile.deleteMany({ owner: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  await mongoose.connection.close();
  console.log('Database connection closed.');
  console.log('\nAll Review Module tests completed.');
}

runTests();

import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import Gig from '../src/models/gig.model.js';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const RECOMMEND_URL = 'http://localhost:5000/api/v1/recommendations';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Connecting to database to verify seeding details...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any old test users
  const testEmailPrefix = 'ai_rec_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });

  // 1. Register Client
  const clientUser = {
    name: 'AI Test Client',
    email: `${testEmailPrefix}client@example.com`,
    password: 'password123',
    role: 'Client'
  };
  console.log(`Registering Client user: ${clientUser.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientUser)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  let emailToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${emailToken}`);

  // Login Client
  const clientLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientUser.email, password: clientUser.password })
  });
  const clientLoginBody = await clientLoginRes.json();
  const clientToken = clientLoginBody.data.accessToken;

  // 2. Publish Gig with skillsRequired: ['React', 'Redux', 'CSS']
  const gigRes = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      title: 'Senior Frontend Developer Needed',
      description: 'Require dashboard engineering with state management.',
      budget: 1200,
      category: 'Frontend',
      deadline: '2026-12-31',
      skillsRequired: ['React', 'Redux', 'CSS'],
      status: 'Published'
    })
  });
  const gigBody = await gigRes.json();
  const gigId = gigBody.data._id;
  console.log(`Gig published: ${gigId}`);

  // 3. Register Freelancers A, B, C
  const freelancerData = [
    { name: 'Freelancer Perfect Match', email: `${testEmailPrefix}f1@example.com`, skills: ['React', 'Redux', 'CSS'] },
    { name: 'Freelancer Partial Match', email: `${testEmailPrefix}f2@example.com`, skills: ['React', 'JavaScript', 'HTML'] },
    { name: 'Freelancer Non Match', email: `${testEmailPrefix}f3@example.com`, skills: ['Node.js', 'Express', 'MongoDB'] }
  ];

  const freelancers = [];

  for (const item of freelancerData) {
    console.log(`Registering Freelancer: ${item.name} (${item.email})`);
    await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.name,
        email: item.email,
        password: 'password123',
        role: 'Freelancer'
      })
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    emailToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
    await fetch(`${AUTH_URL}/verify-email?token=${emailToken}`);

    // Login
    const loginRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: item.email, password: 'password123' })
    });
    const loginBody = await loginRes.json();
    const token = loginBody.data.accessToken;

    // Create Freelancer Profile with specific skills
    // We update/seed via Mongoose directly so it has the target skills in the FreelancerProfile collection
    const userDoc = await User.findOne({ email: item.email });
    const profile = await FreelancerProfile.create({
      owner: userDoc._id,
      skills: item.skills,
      hourlyRate: 50,
      availability: 'Available'
    });

    freelancers.push({ user: userDoc, profile });
  }

  console.log('Accounts and profiles seeded. Calling AI recommendation API...');

  // 4. Query AI Recommendations
  try {
    const res = await fetch(`${RECOMMEND_URL}/gigs/${gigId}/freelancers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('AI Recommendations List (Expect 200, sorted perfect -> partial -> non)', res, body);

    if (body.success) {
      const recs = body.data.recommendations;
      
      const assertion1 = recs.length === 3;
      const assertion2 = recs[0].profile.owner.name === 'Freelancer Perfect Match' && recs[0].similarityScore > 0.9;
      const assertion3 = recs[1].profile.owner.name === 'Freelancer Partial Match' && recs[1].similarityScore > 0.1 && recs[1].similarityScore < 0.9;
      const assertion4 = recs[2].profile.owner.name === 'Freelancer Non Match' && recs[2].similarityScore === 0;

      console.log('\nAsserting results correctness:');
      console.log(`- 3 Recommendations returned: ${assertion1 ? 'PASSED' : 'FAILED'}`);
      console.log(`- Top rank is Perfect Match (~1.0 similarity): ${assertion2 ? 'PASSED' : 'FAILED'}`);
      console.log(`- Mid rank is Partial Match (~0.2 similarity): ${assertion3 ? 'PASSED' : 'FAILED'}`);
      console.log(`- Last rank is Non Match (0.0 similarity): ${assertion4 ? 'PASSED' : 'FAILED'}`);
    }
  } catch (err) {
    console.error('AI Recommendation query failed:', err);
  } finally {
    // 5. Cleanup DB
    console.log('\nCleaning up seeded DB entries...');
    const userIds = [clientUser._id, ...freelancers.map(f => f.user._id)];
    await Gig.findByIdAndDelete(gigId);
    await FreelancerProfile.deleteMany({ owner: { $in: userIds } });
    await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });
    console.log('Cleanup finished.');

    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runTests();

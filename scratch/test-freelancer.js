import fs from 'fs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const FREELANCERS_URL = 'http://localhost:5000/api/v1/freelancers';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Starting Freelancer Profile CRUD tests...');
  const randomNum = Math.floor(Math.random() * 1000000);
  
  // 1. Setup a Client account
  const clientUser = {
    name: 'Client Tester',
    email: `client_tester_${randomNum}@example.com`,
    password: 'password123',
    role: 'Client'
  };

  console.log(`Registering Client user: ${clientUser.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientUser)
  });

  // Verify client email
  let clientVerifyToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${clientVerifyToken}`);
  console.log('Client verified.');

  // Login Client
  let clientToken = '';
  const clientLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientUser.email, password: clientUser.password })
  });
  const clientLoginBody = await clientLoginRes.json();
  clientToken = clientLoginBody.data.accessToken;

  // 2. Attempt to create Freelancer Profile using Client credentials (Expect 403 Forbidden)
  try {
    const res = await fetch(FREELANCERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        skills: ['React', 'Node'],
        hourlyRate: 40
      })
    });
    const body = await res.json();
    logResult('Create Profile with Client Account (Expect 403)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 3. Setup a Freelancer account
  const freelancerUser = {
    name: 'Freelancer Tester',
    email: `freelancer_tester_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };

  console.log(`\nRegistering Freelancer user: ${freelancerUser.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freelancerUser)
  });

  // Verify freelancer email
  await new Promise((resolve) => setTimeout(resolve, 500));
  let freelancerVerifyToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${freelancerVerifyToken}`);
  console.log('Freelancer verified.');

  // Login Freelancer
  let freelancerToken = '';
  let freelancerUserId = '';
  const freelancerLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freelancerUser.email, password: freelancerUser.password })
  });
  const freelancerLoginBody = await freelancerLoginRes.json();
  freelancerToken = freelancerLoginBody.data.accessToken;
  freelancerUserId = freelancerLoginBody.data.user._id;

  // 4. Create Freelancer Profile (Expect 201 Created)
  const profilePayload = {
    skills: ['Node.js', 'Express', 'JavaScript', 'Mongoose'],
    skillLevel: 'Expert',
    hourlyRate: 55,
    certificates: ['MongoDB Certified Developer', 'AWS Cloud Practitioner'],
    portfolio: ['https://freelancerportfolio.com', 'https://github.com/freelancer'],
    availability: 'Part-time',
    languages: ['English', 'Hindi'],
    experienceTimeline: [
      {
        title: 'Senior Developer',
        company: 'WebSolutions LLC',
        duration: '3 years',
        description: 'Led backend server upgrades.'
      }
    ]
  };

  try {
    const res = await fetch(FREELANCERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freelancerToken}`
      },
      body: JSON.stringify(profilePayload)
    });
    const body = await res.json();
    logResult('Create Freelancer Profile (Expect 201)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 5. Read own profile (Expect 200)
  try {
    const res = await fetch(`${FREELANCERS_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${freelancerToken}`
      }
    });
    const body = await res.json();
    logResult('Read Own Freelancer Profile (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 6. Read public profile by user ID (Expect 200)
  try {
    const res = await fetch(`${FREELANCERS_URL}/${freelancerUserId}`, {
      method: 'GET'
    });
    const body = await res.json();
    logResult('Read Public Freelancer Profile (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 7. Update profile and attempt verification badge escalation (Expect 200, badge remains false)
  try {
    const res = await fetch(FREELANCERS_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freelancerToken}`
      },
      body: JSON.stringify({
        hourlyRate: 75,
        availability: 'Available',
        verificationBadge: true // Attempt escalation
      })
    });
    const body = await res.json();
    logResult('Update Profile Details & Badge Escalation Block (Expect 200, badge: false, hourlyRate: 75)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 8. Delete own profile (Expect 200)
  try {
    const res = await fetch(FREELANCERS_URL, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${freelancerToken}`
      }
    });
    const body = await res.json();
    logResult('Delete Freelancer Profile (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 9. Verify deletion: read own profile again (Expect 404)
  try {
    const res = await fetch(`${FREELANCERS_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${freelancerToken}`
      }
    });
    const body = await res.json();
    logResult('Read Own Deleted Profile (Expect 404)', res, body);
  } catch (err) {
    console.error(err);
  }

  console.log('\nAll Freelancer CRUD tests completed.');
}

runTests();

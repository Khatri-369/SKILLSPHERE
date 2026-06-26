import fs from 'fs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Starting Gig CRUD tests...');
  const randomNum = Math.floor(Math.random() * 1000000);
  
  // 1. Setup a Freelancer account
  const freelancerUser = {
    name: 'Freelancer Tester',
    email: `freelancer_gig_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };

  console.log(`Registering Freelancer user: ${freelancerUser.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freelancerUser)
  });

  // Verify freelancer email
  let freelancerVerifyToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${freelancerVerifyToken}`);
  console.log('Freelancer verified.');

  // Login Freelancer
  let freelancerToken = '';
  const freelancerLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freelancerUser.email, password: freelancerUser.password })
  });
  const freelancerLoginBody = await freelancerLoginRes.json();
  freelancerToken = freelancerLoginBody.data.accessToken;

  // 2. Attempt to create Gig using Freelancer credentials (Expect 403 Forbidden)
  try {
    const res = await fetch(GIGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freelancerToken}`
      },
      body: JSON.stringify({
        title: 'MERN Developer needed',
        description: 'Need a developer to write simple APIs.',
        budget: 500,
        category: 'Development',
        deadline: '2026-12-31'
      })
    });
    const body = await res.json();
    logResult('Create Gig with Freelancer Account (Expect 403)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 3. Setup a Client account
  const clientUser = {
    name: 'Client Tester',
    email: `client_gig_${randomNum}@example.com`,
    password: 'password123',
    role: 'Client'
  };

  console.log(`\nRegistering Client user: ${clientUser.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clientUser)
  });

  // Verify client email
  await new Promise((resolve) => setTimeout(resolve, 500));
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

  // 4. Create Gig (Expect 201 Created)
  console.log('\nCreating Gig via multipart/form-data...');
  let gigId = '';
  try {
    const formData = new FormData();
    formData.append('title', 'Build clean MVC backend APIs');
    formData.append('description', 'Need an expert developer to scaffold scalable APIs with validation.');
    formData.append('budget', '800');
    formData.append('category', 'Web Development');
    formData.append('location', 'Remote');
    formData.append('deadline', '2026-08-15');
    formData.append('skillsRequired', 'Node.js, Express, MongoDB, Mongoose');
    formData.append('status', 'Draft');
    
    formData.append('milestones', JSON.stringify([
      { title: 'Project setup & DB config', description: 'Setup database and core express configs.', amount: 200 },
      { title: 'Authentication APIs', description: 'Scaffold registration, verify, login, and forgot flows.', amount: 300 },
      { title: 'Profile and Gig modules', description: 'Complete profiles CRUD and Gig CRUD features.', amount: 300 }
    ]));

    // Append mock files (using native Blob)
    const specBlob = new Blob(['mock spec sheet content'], { type: 'text/plain' });
    formData.append('attachments', specBlob, 'spec_sheet.txt');

    const schemaBlob = new Blob(['mock database schema description'], { type: 'text/plain' });
    formData.append('attachments', schemaBlob, 'db_schema.txt');

    const res = await fetch(GIGS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      },
      body: formData
    });
    const body = await res.json();
    logResult('Create Gig (Expect 201)', res, body);
    if (body.success) {
      gigId = body.data._id;
    }
  } catch (err) {
    console.error(err);
  }

  if (!gigId) {
    console.error('Cannot run remaining tests: Gig creation failed.');
    return;
  }

  // 5. Edit Gig (Expect 200 OK)
  console.log(`\nEditing Gig ${gigId}...`);
  try {
    const formData = new FormData();
    formData.append('budget', '1000'); // Increase budget
    formData.append('skillsRequired', 'Node.js, Express, MongoDB, Mongoose, Passport.js'); // Add skills
    
    const extraBlob = new Blob(['mock file upload on edit'], { type: 'text/plain' });
    formData.append('attachments', extraBlob, 'edit_attachment.txt');

    const res = await fetch(`${GIGS_URL}/${gigId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      },
      body: formData
    });
    const body = await res.json();
    logResult('Edit Gig Budget & Skills (Expect 200, budget: 1000)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 6. Publish Gig (Expect 200 OK, status: Published)
  try {
    const res = await fetch(`${GIGS_URL}/${gigId}/publish`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Publish Gig (Expect 200, status: Published)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 7. Close Gig (Expect 200 OK, status: Closed)
  try {
    const res = await fetch(`${GIGS_URL}/${gigId}/close`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Close Gig (Expect 200, status: Closed)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 8. Delete Gig (Expect 200 OK)
  try {
    const res = await fetch(`${GIGS_URL}/${gigId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Delete Gig (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 9. Verify deletion: attempt to publish deleted gig (Expect 404)
  try {
    const res = await fetch(`${GIGS_URL}/${gigId}/publish`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Publish Deleted Gig (Expect 404)', res, body);
  } catch (err) {
    console.error(err);
  }

  console.log('\nAll Gig CRUD tests completed.');
}

runTests();

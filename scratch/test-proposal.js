import fs from 'fs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const GIGS_URL = 'http://localhost:5000/api/v1/gigs';
const PROPOSALS_URL = 'http://localhost:5000/api/v1/proposals';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Starting Proposal lifecycle integration tests...');
  const randomNum = Math.floor(Math.random() * 1000000);

  // ==========================================
  // 1. SETUP ACCOUNTS & GIGS
  // ==========================================

  // Register Client
  const clientUser = {
    name: 'Proposal Test Client',
    email: `client_prop_${randomNum}@example.com`,
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
  let token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);
  
  // Login Client
  const clientLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientUser.email, password: clientUser.password })
  });
  const clientLoginBody = await clientLoginRes.json();
  const clientToken = clientLoginBody.data.accessToken;
  console.log('Client logged in.');

  // Create & Publish Gig 1
  console.log('Publishing Gig 1...');
  const gigRes1 = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      title: 'Need React Dashboard Dev',
      description: 'Build a gorgeous glassmorphic dashboard in React.',
      budget: 800,
      category: 'Frontend Development',
      deadline: '2026-10-31',
      status: 'Published'
    })
  });
  const gig1 = (await gigRes1.json()).data;
  console.log(`Gig 1 Published: ${gig1._id}`);

  // Create & Publish Gig 2 (for withdrawal testing)
  console.log('Publishing Gig 2...');
  const gigRes2 = await fetch(GIGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clientToken}`
    },
    body: JSON.stringify({
      title: 'Node.js Microservices dev needed',
      description: 'Scaffold containerized REST microservices.',
      budget: 1500,
      category: 'Backend Development',
      deadline: '2026-11-30',
      status: 'Published'
    })
  });
  const gig2 = (await gigRes2.json()).data;
  console.log(`Gig 2 Published: ${gig2._id}`);

  // Register Freelancer A
  const freelancerA = {
    name: 'Freelancer Alice',
    email: `alice_prop_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Freelancer A: ${freelancerA.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freelancerA)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);
  
  // Login Freelancer A
  const freelancerALoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freelancerA.email, password: freelancerA.password })
  });
  const freelancerALoginBody = await freelancerALoginRes.json();
  const tokenA = freelancerALoginBody.data.accessToken;
  console.log('Freelancer A logged in.');

  // Register Freelancer B
  const freelancerB = {
    name: 'Freelancer Bob',
    email: `bob_prop_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
  };
  console.log(`Registering Freelancer B: ${freelancerB.email}`);
  await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(freelancerB)
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  token = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
  await fetch(`${AUTH_URL}/verify-email?token=${token}`);
  
  // Login Freelancer B
  const freelancerBLoginRes = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: freelancerB.email, password: freelancerB.password })
  });
  const freelancerBLoginBody = await freelancerBLoginRes.json();
  const tokenB = freelancerBLoginBody.data.accessToken;
  console.log('Freelancer B logged in.');

  // ==========================================
  // 2. LIFECYCLE TESTS
  // ==========================================
  
  let proposal1Id = '';
  let proposal2Id = '';
  let proposal3Id = '';

  // Test A: Freelancer A Applies to Gig 1
  try {
    const formData = new FormData();
    formData.append('gigId', gig1._id);
    formData.append('bidAmount', '750');
    formData.append('estimatedTime', '10 days');
    formData.append('description', 'I can build this responsive glassmorphic dashboard in React quickly.');
    
    // Mock attachment
    const mockFile = new Blob(['mock resume info'], { type: 'text/plain' });
    formData.append('attachments', mockFile, 'resume_alice.txt');

    const res = await fetch(PROPOSALS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      },
      body: formData
    });
    const body = await res.json();
    logResult('Freelancer A Apply to Gig 1 (Expect 201)', res, body);
    if (body.success) {
      proposal1Id = body.data._id;
    }
  } catch (err) {
    console.error(err);
  }

  // Test B: Prevent Client from applying to their own gig (Expect 400)
  try {
    const res = await fetch(PROPOSALS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        gigId: gig1._id,
        bidAmount: 600,
        estimatedTime: '5 days',
        description: 'Client trying to apply to own gig.'
      })
    });
    const body = await res.json();
    logResult('Client Apply to Own Gig (Expect 400)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test C: Prevent Freelancer A from submitting duplicate proposal (Expect 400)
  try {
    const res = await fetch(PROPOSALS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        gigId: gig1._id,
        bidAmount: 700,
        estimatedTime: '8 days',
        description: 'Another duplicate application attempt.'
      })
    });
    const body = await res.json();
    logResult('Freelancer A Duplicate Apply (Expect 400)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test D: Freelancer A updates proposal (Expect 200)
  try {
    const formData = new FormData();
    formData.append('bidAmount', '720'); // Lower bid
    formData.append('description', 'Updated: I can build the dashboard with custom Tailwind integration.');

    const res = await fetch(`${PROPOSALS_URL}/${proposal1Id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      },
      body: formData
    });
    const body = await res.json();
    logResult('Freelancer A Update Proposal (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test E: Client retrieves all proposals for Gig 1 (Expect 200)
  try {
    const res = await fetch(`${PROPOSALS_URL}/gig/${gig1._id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Client Fetch Proposals for Gig 1 (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test F: Client Proposes Counter-Offer / Negotiation (Expect 200)
  try {
    const res = await fetch(`${PROPOSALS_URL}/${proposal1Id}/negotiate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({
        counterBidAmount: 650,
        counterTime: '7 days',
        clientNotes: 'We need this done in 7 days. Can you accept 650 USD?'
      })
    });
    const body = await res.json();
    logResult('Client Negotiate Counter-Offer (Expect 200, status: Negotiating)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test G: Freelancer A responds and accepts counter-offer (Expect 200, status: Accepted, bidAmount: 650)
  try {
    const res = await fetch(`${PROPOSALS_URL}/${proposal1Id}/negotiate/respond`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        action: 'accept'
      })
    });
    const body = await res.json();
    logResult('Freelancer A Accept Negotiated Counter-Offer (Expect 200, status: Accepted)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test H: Freelancer B applies to Gig 1 (Expect 201)
  try {
    const res = await fetch(PROPOSALS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        gigId: gig1._id,
        bidAmount: 900,
        estimatedTime: '15 days',
        description: 'Applying for React Dashboard as Freelancer B.'
      })
    });
    const body = await res.json();
    logResult('Freelancer B Apply to Gig 1 (Expect 201)', res, body);
    if (body.success) {
      proposal2Id = body.data._id;
    }
  } catch (err) {
    console.error(err);
  }

  // Test I: Client rejects Freelancer B's proposal (Expect 200, status: Rejected)
  try {
    const res = await fetch(`${PROPOSALS_URL}/${proposal2Id}/reject`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clientToken}`
      }
    });
    const body = await res.json();
    logResult('Client Reject Freelancer B Proposal (Expect 200, status: Rejected)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test J: Freelancer B applies to Gig 2 (Expect 201)
  try {
    const res = await fetch(PROPOSALS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        gigId: gig2._id,
        bidAmount: 1400,
        estimatedTime: '20 days',
        description: 'Applying to microservices gig as freelancer B.'
      })
    });
    const body = await res.json();
    logResult('Freelancer B Apply to Gig 2 (Expect 201)', res, body);
    if (body.success) {
      proposal3Id = body.data._id;
    }
  } catch (err) {
    console.error(err);
  }

  // Test K: Freelancer B withdraws proposal (Expect 200, status: Withdrawn)
  try {
    const res = await fetch(`${PROPOSALS_URL}/${proposal3Id}/withdraw`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenB}`
      }
    });
    const body = await res.json();
    logResult('Freelancer B Withdraw Proposal (Expect 200, status: Withdrawn)', res, body);
  } catch (err) {
    console.error(err);
  }

  // Test L: Prevent Freelancer B from updating withdrawn proposal (Expect 400)
  try {
    const res = await fetch(`${PROPOSALS_URL}/${proposal3Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        bidAmount: 1300
      })
    });
    const body = await res.json();
    logResult('Update Withdrawn Proposal (Expect 400/403/404)', res, body);
  } catch (err) {
    console.error(err);
  }

  console.log('\nAll Proposal Lifecycle integration tests completed.');
}

runTests();

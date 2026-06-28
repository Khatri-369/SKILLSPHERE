import axios from 'axios';

async function testHttpWithdraw() {
  try {
    // 1. Log in to get accessToken
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'om@freelancer.com',
      password: 'password123'
    });

    const token = loginRes.data.data.accessToken;
    console.log('Login successful. Token obtained.');

    // 2. Fetch my proposals to find a pending one
    console.log('Fetching proposals...');
    const proposalsRes = await axios.get('http://localhost:5000/api/v1/proposals/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const proposals = proposalsRes.data.data;
    const pendingProposal = proposals.find(p => p.status === 'Pending');

    if (!pendingProposal) {
      console.log('No pending proposals found for user om@freelancer.com.');
      return;
    }

    const proposalId = pendingProposal._id;
    console.log(`Found pending proposal ID: ${proposalId}. Sending withdraw request...`);

    // 3. Withdraw
    const withdrawRes = await axios.patch(`http://localhost:5000/api/v1/proposals/${proposalId}/withdraw`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Withdraw Response:', withdrawRes.data);

    // 4. Verify in DB/fetch list again
    const verifyRes = await axios.get('http://localhost:5000/api/v1/proposals/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedProposal = verifyRes.data.data.find(p => p._id === proposalId);
    console.log(`New proposal status: ${updatedProposal.status}`);

    // Clean up: reset it back to Pending (via database update or direct db query)
    // Actually, we can just edit the DB directly afterwards to restore it to pending if we want, or leave it.
  } catch (error) {
    console.error('HTTP test failed:', error.response?.data || error.message);
  }
}

testHttpWithdraw();

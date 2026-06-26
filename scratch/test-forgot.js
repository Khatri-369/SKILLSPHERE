import fs from 'fs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Starting Forgot Password tests...');
  const randomNum = Math.floor(Math.random() * 1000000);
  
  const testUser = {
    name: 'Forgot Pass User',
    email: `forgot_user_${randomNum}@example.com`,
    password: 'oldPassword123',
    role: 'Client'
  };

  console.log(`1. Registering user: ${testUser.email}`);
  try {
    await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
  } catch (err) {
    console.error('Registration failed:', err);
    return;
  }

  // 2. Read verification token to activate account
  let verifyToken = '';
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    verifyToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
    console.log(`Read verification token: ${verifyToken}`);
    await fetch(`${AUTH_URL}/verify-email?token=${verifyToken}`);
    console.log('User verified successfully.');
  } catch (err) {
    console.error('Failed to verify user:', err);
    return;
  }

  // 3. Request Forgot Password
  try {
    // Clear old token file first
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
    }

    const res = await fetch(`${AUTH_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email })
    });
    const body = await res.json();
    logResult('Request Forgot Password (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 4. Read the reset token from the logs
  let resetToken = '';
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      resetToken = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8').trim();
      console.log(`Read reset token: ${resetToken}`);
    } else {
      console.error('Reset token file not found.');
      return;
    }
  } catch (err) {
    console.error('Failed to read reset token:', err);
    return;
  }

  // 5. Call reset-password with the token and new password
  const newPassword = 'newPassword456';
  try {
    const res = await fetch(`${AUTH_URL}/reset-password?token=${resetToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    const body = await res.json();
    logResult('Reset Password with Token (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 6. Try to log in with OLD password (Expect 401 Unauthorized)
  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const body = await res.json();
    logResult('Login with OLD Password (Expect 401)', res, body);
  } catch (err) {
    console.error(err);
  }

  // 7. Try to log in with NEW password (Expect 200 Success)
  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword
      })
    });
    const body = await res.json();
    logResult('Login with NEW Password (Expect 200)', res, body);
  } catch (err) {
    console.error(err);
  }

  console.log('\nAll Forgot Password tests completed.');
}

runTests();

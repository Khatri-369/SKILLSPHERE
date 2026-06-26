import fs from 'fs';

const AUTH_URL = 'http://localhost:5000/api/v1/auth';
const PROFILE_URL = 'http://localhost:5000/api/v1/users/profile';
const TOKEN_FILE_PATH = 'c:/Users/KHATRI OM KUMAR/Desktop/SKILLSPHERE/logs/last-email-token.txt';

const logResult = (testName, response, body) => {
  console.log(`\n--- Test: ${testName} ---`);
  console.log(`Status: ${response.status}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
};

async function runTests() {
  console.log('Starting User Profile tests...');
  const randomNum = Math.floor(Math.random() * 1000000);
  
  const testUser = {
    name: 'Profile Owner',
    email: `profile_user_${randomNum}@example.com`,
    password: 'password123',
    role: 'Freelancer'
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
    await fetch(`${AUTH_URL}/verify-email?token=${verifyToken}`);
    console.log('User verified successfully.');
  } catch (err) {
    console.error('Failed to verify user:', err);
    return;
  }

  // 3. Login to get Access Token
  let accessToken = '';
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
    accessToken = body.data.accessToken;
  } catch (err) {
    console.error('Login failed:', err);
    return;
  }

  // 4. Update Profile with text inputs and files using native FormData/Blob
  console.log('\nSubmitting profile updates via multipart/form-data...');
  try {
    const formData = new FormData();
    formData.append('bio', 'Full Stack Developer with a passion for clean MVC code.');
    formData.append('skills', 'Node, Express, MongoDB, JavaScript, Mongoose');
    formData.append('location', 'New Delhi, India');
    formData.append('phone', '+919876543210');
    formData.append('portfolio', 'https://myportfolio.dev');
    
    formData.append('experience', JSON.stringify([
      {
        title: 'Backend Intern',
        company: 'SkillSphere Corp',
        startDate: '2025-01-01',
        endDate: '2025-06-01',
        current: false,
        description: 'Assisted in scaffolding APIs and authentication strategies.'
      }
    ]));

    formData.append('education', JSON.stringify([
      {
        school: 'Tech Institute of Science',
        degree: 'B.Tech',
        fieldOfStudy: 'Computer Science',
        startDate: '2021-07-01',
        endDate: '2025-05-30',
        description: 'Focused on web systems.'
      }
    ]));

    // Append mock files (using native Blob)
    const avatarBlob = new Blob(['mock avatar photo content'], { type: 'image/png' });
    formData.append('avatar', avatarBlob, 'my_avatar.png');

    const resumeBlob = new Blob(['mock resume pdf document'], { type: 'application/pdf' });
    formData.append('resume', resumeBlob, 'my_resume.pdf');

    const res = await fetch(PROFILE_URL, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData // Node fetch will set the correct multipart boundaries
    });
    const body = await res.json();
    logResult('Update Profile Details & Files (Expect 200)', res, body);
  } catch (err) {
    console.error('Profile update failed:', err);
  }

  console.log('\nAll Profile tests completed.');
}

runTests();

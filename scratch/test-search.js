import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import Gig from '../src/models/gig.model.js';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1/search';

// Helper to log test status
const logTestResult = (name, assertion) => {
  if (assertion) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.log(`❌ FAIL: ${name}`);
  }
};

async function runTests() {
  console.log('Connecting to database for seeding search test data...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillsphere';
  await mongoose.connect(mongoUri);
  console.log('Database connected.');

  // Clean up any potential leftover test users first
  const testEmailPrefix = 'test_search_';
  await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`, 'i') });
  
  // 1. Seed Users (Freelancers & Client)
  const clientUser = await User.create({
    name: 'Search Test Client',
    email: `${testEmailPrefix}client@example.com`,
    password: 'password123',
    role: 'Client',
    isVerified: true
  });

  const freelancerUserA = await User.create({
    name: 'John Node Developer',
    email: `${testEmailPrefix}node@example.com`,
    password: 'password123',
    role: 'Freelancer',
    isVerified: true,
    location: 'Boston'
  });

  const freelancerUserB = await User.create({
    name: 'Jane React Developer',
    email: `${testEmailPrefix}react@example.com`,
    password: 'password123',
    role: 'Freelancer',
    isVerified: true,
    location: 'New York'
  });

  const freelancerUserC = await User.create({
    name: 'Alice Python Developer',
    email: `${testEmailPrefix}python@example.com`,
    password: 'password123',
    role: 'Freelancer',
    isVerified: true,
    location: 'Boston'
  });

  // 2. Seed Freelancer Profiles
  const profileA = await FreelancerProfile.create({
    owner: freelancerUserA._id,
    skills: ['Node.js', 'Express', 'MongoDB'],
    skillLevel: 'Expert',
    hourlyRate: 90,
    rating: 4.8,
    reviewsCount: 12,
    availability: 'Available',
    experienceTimeline: [{
      title: 'Senior Node Backend Engineer',
      company: 'AppInc',
      duration: '3 years',
      description: 'Built scalable systems.'
    }]
  });

  const profileB = await FreelancerProfile.create({
    owner: freelancerUserB._id,
    skills: ['React', 'CSS', 'HTML'],
    skillLevel: 'Intermediate',
    hourlyRate: 60,
    rating: 4.2,
    reviewsCount: 5,
    availability: 'Part-time',
    experienceTimeline: [{
      title: 'Frontend UI Developer',
      company: 'WebStudio',
      duration: '1 year',
      description: 'Crafted nice designs.'
    }]
  });

  const profileC = await FreelancerProfile.create({
    owner: freelancerUserC._id,
    skills: ['Python', 'Django'],
    skillLevel: 'Intermediate',
    hourlyRate: 120,
    rating: 3.5,
    reviewsCount: 2,
    availability: 'Available',
    experienceTimeline: [{
      title: 'Django Python Coder',
      company: 'PyCorp',
      duration: '2 years',
      description: 'Worked on automation.'
    }]
  });

  // 3. Seed Gigs
  const gigX = await Gig.create({
    client: clientUser._id,
    title: 'Need Senior Node Backend Engineer',
    description: 'Looking for a developer to build REST APIs.',
    budget: 1500,
    category: 'Backend',
    location: 'Boston',
    skillsRequired: ['Node.js', 'Express'],
    deadline: new Date('2026-12-31'),
    status: 'Published'
  });

  const gigY = await Gig.create({
    client: clientUser._id,
    title: 'React Frontend CSS Fixes',
    description: 'Clean up some visual styling on react components.',
    budget: 300,
    category: 'Frontend',
    location: 'Remote',
    skillsRequired: ['React', 'CSS'],
    deadline: new Date('2026-12-31'),
    status: 'Published'
  });

  const gigZ = await Gig.create({
    client: clientUser._id,
    title: 'Python Scripting Automation Task',
    description: 'Build scripts to process spreadsheet datasets.',
    budget: 500,
    category: 'Backend',
    location: 'New York',
    skillsRequired: ['Python'],
    deadline: new Date('2026-12-31'),
    status: 'Draft' // Draft gigs should not appear by default (default search filter is Published)
  });

  console.log('Test database seeded. Running REST assertions against API...');

  try {
    // --- FREELANCER SEARCH TESTS ---

    // Test A: Filter by location (Boston)
    let res = await fetch(`${BASE_URL}/freelancers?location=Boston`);
    let body = await res.json();
    logTestResult('Freelancers search: filter by location=Boston returns 2 profiles', 
      body.success && body.data.freelancers.length === 2 && 
      body.data.freelancers.some(f => f.ownerDetails.name === 'John Node Developer') &&
      body.data.freelancers.some(f => f.ownerDetails.name === 'Alice Python Developer')
    );

    // Test B: Filter by skill (Node.js)
    res = await fetch(`${BASE_URL}/freelancers?skills=Node.js`);
    body = await res.json();
    logTestResult('Freelancers search: filter by skills=Node.js returns 1 profile', 
      body.success && body.data.freelancers.length === 1 && 
      body.data.freelancers[0].ownerDetails.name === 'John Node Developer'
    );

    // Test C: Filter by rate range (60 to 100)
    res = await fetch(`${BASE_URL}/freelancers?minRate=60&maxRate=100`);
    body = await res.json();
    logTestResult('Freelancers search: filter by hourlyRate range (60-100) returns 2 profiles', 
      body.success && body.data.freelancers.length === 2
    );

    // Test D: Filter by rating (>= 4.0)
    res = await fetch(`${BASE_URL}/freelancers?minRating=4.0`);
    body = await res.json();
    logTestResult('Freelancers search: filter by rating >= 4.0 returns 2 profiles', 
      body.success && body.data.freelancers.length === 2 && 
      body.data.freelancers.every(f => f.rating >= 4.0)
    );

    // Test E: Filter by experience timeline title
    res = await fetch(`${BASE_URL}/freelancers?experience=Senior Node`);
    body = await res.json();
    logTestResult('Freelancers search: filter by experience="Senior Node" returns 1 profile', 
      body.success && body.data.freelancers.length === 1 && 
      body.data.freelancers[0].ownerDetails.name === 'John Node Developer'
    );

    // Test F: General search term across name/bio/skills
    res = await fetch(`${BASE_URL}/freelancers?search=React`);
    body = await res.json();
    logTestResult('Freelancers search: search query "React" returns 1 profile', 
      body.success && body.data.freelancers.length === 1 && 
      body.data.freelancers[0].ownerDetails.name === 'Jane React Developer'
    );

    // Test G: Sorting (by hourlyRate ascending)
    res = await fetch(`${BASE_URL}/freelancers?sortBy=hourlyRate&sortOrder=asc`);
    body = await res.json();
    logTestResult('Freelancers search: sorting by hourlyRate asc returns order (Jane: 60, John: 90, Alice: 120)', 
      body.success && body.data.freelancers.length === 3 &&
      body.data.freelancers[0].hourlyRate === 60 &&
      body.data.freelancers[1].hourlyRate === 90 &&
      body.data.freelancers[2].hourlyRate === 120
    );

    // Test H: Pagination
    res = await fetch(`${BASE_URL}/freelancers?limit=2&page=1`);
    body = await res.json();
    logTestResult('Freelancers search: pagination works (returns 2 items and valid pagination metadata)', 
      body.success && body.data.freelancers.length === 2 &&
      body.data.pagination.total === 3 &&
      body.data.pagination.pages === 2
    );

    // --- GIG SEARCH TESTS ---

    // Test I: Category filter (Backend)
    res = await fetch(`${BASE_URL}/gigs?category=Backend`);
    body = await res.json();
    logTestResult('Gigs search: filter by category=Backend returns 1 published gig', 
      body.success && body.data.gigs.length === 1 && 
      body.data.gigs[0].title === 'Need Senior Node Backend Engineer'
    );

    // Test J: Skills filter (React)
    res = await fetch(`${BASE_URL}/gigs?skills=React`);
    body = await res.json();
    logTestResult('Gigs search: filter by skills=React returns 1 gig', 
      body.success && body.data.gigs.length === 1 && 
      body.data.gigs[0].title === 'React Frontend CSS Fixes'
    );

    // Test K: Budget range (min 400)
    res = await fetch(`${BASE_URL}/gigs?minBudget=400`);
    body = await res.json();
    logTestResult('Gigs search: filter by minBudget=400 returns 1 published gig', 
      body.success && body.data.gigs.length === 1 && 
      body.data.gigs[0].budget === 1500
    );

    // Test L: General search (text query)
    res = await fetch(`${BASE_URL}/gigs?search=styling`);
    body = await res.json();
    logTestResult('Gigs search: search term "styling" returns 1 gig', 
      body.success && body.data.gigs.length === 1 && 
      body.data.gigs[0].title === 'React Frontend CSS Fixes'
    );

    // Test M: Status draft filtering (returns only draft gig)
    res = await fetch(`${BASE_URL}/gigs?status=Draft`);
    body = await res.json();
    logTestResult('Gigs search: status=Draft returns 1 gig', 
      body.success && body.data.gigs.length === 1 && 
      body.data.gigs[0].title === 'Python Scripting Automation Task'
    );

  } catch (error) {
    console.error('REST API query error:', error);
  } finally {
    // 4. Cleanup seeded DB entries
    console.log('\nCleaning up database seeded entries...');
    const clientUserIds = [clientUser._id];
    const freelancerUserIds = [freelancerUserA._id, freelancerUserB._id, freelancerUserC._id];

    await Gig.deleteMany({ client: { $in: clientUserIds } });
    await FreelancerProfile.deleteMany({ owner: { $in: freelancerUserIds } });
    await User.deleteMany({ _id: { $in: [...clientUserIds, ...freelancerUserIds] } });

    console.log('Cleanup completed. Closing database connection.');
    await mongoose.connection.close();
  }
}

runTests();

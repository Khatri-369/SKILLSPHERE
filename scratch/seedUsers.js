import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Gig from '../src/models/gig.model.js';
import Proposal from '../src/models/proposal.model.js';
import Review from '../src/models/review.model.js';
import Dispute from '../src/models/dispute.model.js';
import FreelancerProfile from '../src/models/freelancerProfile.model.js';
import Message from '../src/models/message.model.js';
import Notification from '../src/models/notification.model.js';
import Payment from '../src/models/payment.model.js';
import config from '../src/config/index.js';

async function seed() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB database...');

    // Clear all collections
    await User.deleteMany({});
    await Gig.deleteMany({});
    await Proposal.deleteMany({});
    await Review.deleteMany({});
    await Dispute.deleteMany({});
    await FreelancerProfile.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared all previous accounts and documents.');

    // Create Client account
    const client = await User.create({
      name: 'Test Client',
      email: 'client@test.com',
      password: 'password123',
      role: 'Client',
      isVerified: true,
    });
    console.log('Client account created successfully!');
    console.log('Email: client@test.com');
    console.log('Password: password123\n');

    // Create Freelancer account
    const freelancer = await User.create({
      name: 'Test Freelancer',
      email: 'freelancer@test.com',
      password: 'password123',
      role: 'Freelancer',
      isVerified: true,
    });
    console.log('Freelancer account created successfully!');
    console.log('Email: freelancer@test.com');
    console.log('Password: password123\n');

    // Create default profile for the freelancer
    await FreelancerProfile.create({
      owner: freelancer._id,
      skills: ['React', 'Node.js', 'Express', 'MongoDB'],
      hourlyRate: 500,
      availability: 'Available',
      bio: 'Professional MERN Stack Developer with 3+ years of experience.',
      experienceTimeline: [
        {
          title: 'Senior Web Developer',
          company: 'Tech Solutions',
          duration: '2 years',
          description: 'Responsible for backend architecture and frontend component design.'
        }
      ]
    });
    console.log('Created default Freelancer profile.');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding database failed:', error);
    process.exit(1);
  }
}

seed();

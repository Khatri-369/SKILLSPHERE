import mongoose from 'mongoose';
import Proposal from '../src/models/proposal.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/skillsphere';

async function testWithdraw() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    // Find a pending proposal
    const proposal = await Proposal.findOne({ status: 'Pending' });
    if (!proposal) {
      console.log('No pending proposal found to test with.');
      return;
    }

    console.log(`Found pending proposal with ID: ${proposal._id}`);
    
    // Simulate withdraw
    proposal.status = 'Withdrawn';
    await proposal.save();
    console.log('Status updated to Withdrawn successfully in DB!');

    // Restore to Pending
    proposal.status = 'Pending';
    await proposal.save();
    console.log('Status reset back to Pending.');
  } catch (error) {
    console.error('Error running withdraw test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

testWithdraw();

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/skillsphere';

async function restore() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');
    
    const db = mongoose.connection.db;
    const result = await db.collection('proposals').updateMany(
      { status: 'Withdrawn' },
      { $set: { status: 'Pending' } }
    );
    console.log(`Successfully restored ${result.modifiedCount} proposals back to Pending.`);
  } catch (error) {
    console.error('Error restoring proposals:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

restore();

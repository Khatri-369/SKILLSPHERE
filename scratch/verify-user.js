import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/skillsphere';

async function verifyUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // We can import User or just use the model definition directly
    const userSchema = new mongoose.Schema({
      email: String,
      isVerified: Boolean,
    }, { strict: false });

    const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

    const email = 'om@freelancer.com';
    const result = await User.updateOne(
      { email },
      { $set: { isVerified: true } }
    );

    if (result.matchedCount > 0) {
      console.log(`Successfully verified user with email: ${email}`);
    } else {
      console.log(`No user found with email: ${email}`);
    }
  } catch (error) {
    console.error('Error verifying user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

verifyUser();

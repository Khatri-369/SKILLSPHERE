import mongoose from 'mongoose';
import config from '../config/index.js';
import { DB_NAME } from '../constants/index.js';

const connectDB = async () => {
  try {
    console.log('Initializing MongoDB connection...');
    const dbUri = config.mongodbUri.includes(DB_NAME)
      ? config.mongodbUri
      : `${config.mongodbUri}/${DB_NAME}`;
    const connectionInstance = await mongoose.connect(dbUri);
    console.log(
      `MongoDB Connected Successfully! Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error('MongoDB connection failed: ', error);
    process.exit(1);
  }
};

export default connectDB;

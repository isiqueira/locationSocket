import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncCitiesFromDictionary } from './sync-cities.js';

dotenv.config();

const runTest = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_DATABASE);
    console.log('MongoDB Connected');

    await syncCitiesFromDictionary();

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

runTest();

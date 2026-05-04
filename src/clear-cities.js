import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const clearCities = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_DATABASE);
    console.log('MongoDB Connected');

    console.log('Attempting to drop the "Cities" collection...');
    await mongoose.connection.db.dropCollection('Cities');
    console.log('Successfully dropped the "Cities" collection.');

  } catch (error) {
    if (error.code === 26) {
      console.log('The "Cities" collection does not exist, no need to drop it.');
    } else {
      console.error('An error occurred:', error);
    }
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  }
};

clearCities();

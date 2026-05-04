import mongoose from 'mongoose';
import { MONGO_DATABASE } from '../config/env.js';

export async function connectMongo() {
  console.log('MONGO_DATABASE:', MONGO_DATABASE);
  await mongoose.connect(MONGO_DATABASE);
  console.log('MongoDB Connected');
  mongoose.connection.on('error', err => console.error('MongoDB connection error:', err));
}

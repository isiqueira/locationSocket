import dotenv from 'dotenv';
dotenv.config();

export const MONGO_DATABASE = process.env.MONGO_DATABASE;
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
export const REDIS_USERNAME = process.env.REDIS_USERNAME;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
export const PORT = parseInt(process.env.PORT) || 4000;

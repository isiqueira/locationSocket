import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD } from '../config/env.js';

export function createRedisClient() {
  const client = createClient({
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD || undefined,
    socket: { host: REDIS_HOST, port: REDIS_PORT }
  });
  client.on('error', err => console.error('Redis Client Error', err));
  client.on('connect', () => console.log('Redis client connected'));
  return client;
}

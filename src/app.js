import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from 'socket.io';
import { JWT_SECRET } from './config/env.js';
import { createRedisClient } from './infra/redis.js';
import SocketManager from './modules/tracking/socket-manager.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { cityRoutes } from './modules/cities/city.routes.js';
import { checkpointRoutes } from './modules/checkpoints/checkpoint.routes.js';
import { forbiddenAreaRoutes } from './modules/forbidden-areas/forbidden-area.routes.js';

export async function buildApp({ redisClient, skipSocket = false } = {}) {
  const fastify = Fastify({ logger: false });

  const io = new Server(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    allowEIO3: true
  });

  await fastify.register(cors, { origin: '*', methods: ['GET', 'POST'] });
  await fastify.register(jwt, { secret: JWT_SECRET });

  let redis = redisClient;
  if (!redis) {
    redis = createRedisClient();
    await redis.connect();
  }

  if (!skipSocket) {
    const jwtVerify = (token) => fastify.jwt.verify(token);
    const socketManager = new SocketManager(io, redis, jwtVerify);
    await socketManager.initialize();
  }

  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url === '/login') return;
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get('/', async (request, reply) => {
    return reply.code(200).send({ version: '1.0.0', name: 'locationSocket API' });
  });

  await fastify.register(authRoutes);
  await fastify.register(cityRoutes);
  await fastify.register(checkpointRoutes);
  await fastify.register(forbiddenAreaRoutes);

  return fastify;
}

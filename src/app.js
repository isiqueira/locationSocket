import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import SocketManager from './socket-manager.js';
import City from './schemas/city.model.js';
import ForbiddenArea from './schemas/forbidden-area.model.js';
import CheckPoint from './schemas/checkpoint.model.js';

dotenv.config();

export async function buildApp({ redisClient, skipSocket = false } = {}) {
  const fastify = Fastify({ logger: false });

  // Socket.IO
  const io = new Server(fastify.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    allowEIO3: true
  });

  // Plugins
  await fastify.register(cors, { origin: '*', methods: ['GET', 'POST'] });
  await fastify.register(jwt, { secret: process.env.JWT_SECRET || 'changeme' });

  // Redis — usa o injetado (testes) ou cria um real
  let redis = redisClient;
  if (!redis) {
    redis = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379
      }
    });
    redis.on('error', err => console.error('Redis Client Error', err));
    redis.on('connect', () => console.log('Redis client connected'));
    await redis.connect();
  }

  // Socket manager — passa jwtVerify para habilitar auth JWT no handshake (#13)
  if (!skipSocket) {
    const jwtVerify = (token) => fastify.jwt.verify(token);
    const socketManager = new SocketManager(io, redis, jwtVerify);
    await socketManager.initialize();
  }

  // Auth hook — exclui /login
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url === '/login') return;
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // Rotas REST
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;
    // TODO (#15): validar credenciais contra banco de dados
    if (username === 'admin' && password === 'password') {
      const token = fastify.jwt.sign({ username });
      return reply.send({ token });
    }
    return reply.status(401).send({ message: 'Invalid credentials' });
  });

  fastify.get('/', async (request, reply) => {
    return reply.code(200).send({ version: '1.0.0', name: 'locationSocket API' });
  });

  fastify.get('/where-i-am', async (request, reply) => {
    try {
      const point = {
        type: 'Point',
        coordinates: [parseFloat(request.query.lng), parseFloat(request.query.lat)]
      };
      const city = await City.findOne({
        geometry: { $geoIntersects: { $geometry: point } }
      });
      return reply.code(200).send(city);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to find city.' });
    }
  });

  fastify.get('/cities', async (request, reply) => {
    try {
      const filter = {};
      if (request.query.state) filter.state = request.query.state;
      if (request.query.name) filter.name = request.query.name;
      const cities = await City.find(filter);
      return reply.code(200).send(cities);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get cities.' });
    }
  });

  fastify.get('/cities/:id', async (request, reply) => {
    try {
      const city = await City.findOne({ externalId: request.params.id });
      if (!city) return reply.code(404).send({ message: 'City not found.' });
      return reply.code(200).send(city);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get city.' });
    }
  });

  // Rotas ForbiddenArea (#11)
  fastify.get('/forbidden-areas', async (request, reply) => {
    try {
      const areas = await ForbiddenArea.find({});
      return reply.code(200).send(areas);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get forbidden areas.' });
    }
  });

  fastify.get('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await ForbiddenArea.findById(request.params.id);
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(200).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get forbidden area.' });
    }
  });

  fastify.post('/forbidden-areas', async (request, reply) => {
    try {
      const area = new ForbiddenArea(request.body);
      await area.save();
      return reply.code(201).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to create forbidden area.' });
    }
  });

  fastify.put('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await ForbiddenArea.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      );
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(200).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to update forbidden area.' });
    }
  });

  fastify.delete('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await ForbiddenArea.findByIdAndDelete(request.params.id);
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to delete forbidden area.' });
    }
  });

  // Rotas Checkpoints
  fastify.get('/checkpoints', async (request, reply) => {
    try {
      const checkpoints = await CheckPoint.find({});
      return reply.code(200).send(checkpoints);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get checkpoints.' });
    }
  });

  fastify.get('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await CheckPoint.findById(request.params.id);
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(200).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get checkpoint.' });
    }
  });

  fastify.post('/checkpoints', async (request, reply) => {
    try {
      const checkpoint = new CheckPoint(request.body);
      await checkpoint.save();
      return reply.code(201).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to create checkpoint.' });
    }
  });

  fastify.put('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await CheckPoint.findByIdAndUpdate(
        request.params.id,
        request.body,
        { new: true, runValidators: true }
      );
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(200).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to update checkpoint.' });
    }
  });

  fastify.delete('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await CheckPoint.findByIdAndDelete(request.params.id);
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to delete checkpoint.' });
    }
  });

  return fastify;
}

// Entry point — só executado diretamente, não ao importar
const isMain = process.argv[1] && process.argv[1].endsWith('app.js');
if (isMain) {
  console.log('MONGO_DATABASE:', process.env.MONGO_DATABASE);

  mongoose.connect(process.env.MONGO_DATABASE).then(() => {
    console.log('MongoDB Connected');
  }).catch(err => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
  });

  const app = await buildApp();

  const start = async () => {
    try {
      await app.listen({ port: parseInt(process.env.PORT) || 4000, host: '0.0.0.0' });
      console.log(`Server listening on port ${process.env.PORT || 4000}`);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  start();
}

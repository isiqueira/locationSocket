import { validateCredentials } from './auth.service.js';

export async function authRoutes(fastify) {
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body;
    if (validateCredentials(username, password)) {
      const token = fastify.jwt.sign({ username });
      return reply.send({ token });
    }
    return reply.status(401).send({ message: 'Invalid credentials' });
  });
}

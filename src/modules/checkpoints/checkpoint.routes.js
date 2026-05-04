import * as checkpointService from './checkpoint.service.js';

export async function checkpointRoutes(fastify) {
  fastify.get('/checkpoints', async (request, reply) => {
    try {
      const checkpoints = await checkpointService.findAll();
      return reply.code(200).send(checkpoints);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get checkpoints.' });
    }
  });

  fastify.get('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await checkpointService.findById(request.params.id);
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(200).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get checkpoint.' });
    }
  });

  fastify.post('/checkpoints', async (request, reply) => {
    try {
      const checkpoint = await checkpointService.create(request.body);
      return reply.code(201).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to create checkpoint.' });
    }
  });

  fastify.put('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await checkpointService.update(request.params.id, request.body);
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(200).send(checkpoint);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to update checkpoint.' });
    }
  });

  fastify.delete('/checkpoints/:id', async (request, reply) => {
    try {
      const checkpoint = await checkpointService.remove(request.params.id);
      if (!checkpoint) return reply.code(404).send({ message: 'Checkpoint not found.' });
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to delete checkpoint.' });
    }
  });
}

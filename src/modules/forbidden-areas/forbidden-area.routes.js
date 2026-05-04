import * as forbiddenAreaService from './forbidden-area.service.js';

export async function forbiddenAreaRoutes(fastify) {
  fastify.get('/forbidden-areas', async (request, reply) => {
    try {
      const areas = await forbiddenAreaService.findAll();
      return reply.code(200).send(areas);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get forbidden areas.' });
    }
  });

  fastify.get('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await forbiddenAreaService.findById(request.params.id);
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(200).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get forbidden area.' });
    }
  });

  fastify.post('/forbidden-areas', async (request, reply) => {
    try {
      const area = await forbiddenAreaService.create(request.body);
      return reply.code(201).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to create forbidden area.' });
    }
  });

  fastify.put('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await forbiddenAreaService.update(request.params.id, request.body);
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(200).send(area);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to update forbidden area.' });
    }
  });

  fastify.delete('/forbidden-areas/:id', async (request, reply) => {
    try {
      const area = await forbiddenAreaService.remove(request.params.id);
      if (!area) return reply.code(404).send({ message: 'Forbidden area not found.' });
      return reply.code(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to delete forbidden area.' });
    }
  });
}

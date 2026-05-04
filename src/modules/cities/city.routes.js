import * as cityService from './city.service.js';

export async function cityRoutes(fastify) {
  fastify.get('/where-i-am', async (request, reply) => {
    try {
      const city = await cityService.findCityByPoint(request.query.lat, request.query.lng);
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
      const cities = await cityService.findCities(filter);
      return reply.code(200).send(cities);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get cities.' });
    }
  });

  fastify.get('/cities/:id', async (request, reply) => {
    try {
      const city = await cityService.findCityById(request.params.id);
      if (!city) return reply.code(404).send({ message: 'City not found.' });
      return reply.code(200).send(city);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ message: 'Failed to get city.' });
    }
  });
}

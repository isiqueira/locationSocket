import { findNearCheckpoints, findForbiddenAreas } from './tracking.service.js';

const REDIS_TTL_SECONDS = 86400;

class SocketManager {
  constructor(io, redisClient, jwtVerify = null) {
    this.io = io;
    this.redisClient = redisClient;
    this.jwtVerify = jwtVerify;
    this.loggedCheckpoints = {};
    this.cacheSocketKey = 'CacheDataSocket';
    this.locations = [];
  }

  async initialize() {
    try {
      const redisData = await this.redisClient.get(this.cacheSocketKey);
      if (redisData) {
        this.locations = JSON.parse(redisData);
      }
    } catch (err) {
      console.error('Erro ao carregar cache inicial do Redis:', err);
    }

    if (this.jwtVerify) {
      this.io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('authentication_required'));
        }
        try {
          socket.user = await this.jwtVerify(token);
          next();
        } catch (err) {
          next(new Error('invalid_token'));
        }
      });
    }

    this.io.on('connection', async socket => {
      console.info(`Client connected [id=${socket.id}]`);
      const checkpointId = socket.handshake.query.checkpoint;

      socket.emit('on_connect', this.locations);
      socket.emit('locations', this.locations);

      if (checkpointId) {
        this.loggedCheckpoints[checkpointId] = socket.id;
        console.log(`Checkpoint Connected: ${checkpointId}`);
        socket.join(`checkpoint-${checkpointId}`);
        console.log('checkpoint added to room');
      } else {
        console.log('a new client connected');
      }

      socket.on('change', async location => {
        const idx = this.locations.findIndex(l => l.idDevice === location.idDevice);
        if (idx > -1) this.locations.splice(idx, 1);
        this.locations.push(location);

        try {
          const nearCheckpoints = await this._findNearCheckpoints(location);
          nearCheckpoints.forEach(near => {
            console.log(`Have a checkpoint near: ${near._id}`);
            this.io.to(`checkpoint-${near._id}`).emit('trucksnear', location);
          });
        } catch (err) {
          console.error('Erro ao buscar checkpoints próximos:', err);
        }

        try {
          const forbiddenAreas = await this._findForbiddenAreas(location);
          forbiddenAreas.forEach(area => {
            console.log(`Device ${location.idDevice} entered forbidden area: ${area.name}`);
            socket.emit('forbidden_area_entered', { location, area });
            socket.broadcast.emit('forbidden_area_entered', { location, area });
          });
        } catch (err) {
          console.error('Erro ao verificar áreas proibidas:', err);
        }

        try {
          await this.redisClient.set(
            this.cacheSocketKey,
            JSON.stringify(this.locations),
            { EX: REDIS_TTL_SECONDS }
          );
        } catch (err) {
          console.error('Erro ao atualizar cache Redis:', err);
        }

        socket.broadcast.emit('locations', location);
      });

      socket.on('disconnect', () => {
        console.info(`Client disconnected [id=${socket.id}]`);
        if (checkpointId) {
          delete this.loggedCheckpoints[checkpointId];
        }
      });
    });
  }

  async _findNearCheckpoints(location) {
    return findNearCheckpoints(location);
  }

  async _findForbiddenAreas(location) {
    return findForbiddenAreas(location);
  }
}

export default SocketManager;

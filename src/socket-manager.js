import mongoose from 'mongoose';
import CheckPoint from './schemas/checkpoint.model.js';
import ForbiddenArea from './schemas/forbidden-area.model.js';

// TTL padrão do cache Redis: 24 horas (em segundos)
const REDIS_TTL_SECONDS = 86400;

class SocketManager {
  constructor(io, redisClient, jwtVerify = null) {
    this.io = io;
    this.redisClient = redisClient;
    this.jwtVerify = jwtVerify; // função opcional: (token) => Promise<payload>
    this.loggedCheckpoints = {};
    this.cacheSocketKey = 'CacheDataSocket';
    this.locations = [];
  }

  async initialize() {
    // Carrega localizações iniciais do Redis
    try {
      const redisData = await this.redisClient.get(this.cacheSocketKey);
      if (redisData) {
        this.locations = JSON.parse(redisData);
      }
    } catch (err) {
      console.error('Erro ao carregar cache inicial do Redis:', err);
    }

    // Middleware de autenticação JWT no handshake (#13)
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

      // Envia estado atual apenas para o cliente que acabou de conectar
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
        // Atualiza lista em memória
        const idx = this.locations.findIndex(l => l.idDevice === location.idDevice);
        if (idx > -1) this.locations.splice(idx, 1);
        this.locations.push(location);

        // Notifica checkpoints próximos
        try {
          const nearCheckpoints = await this._findNearCheckpoints(location);

          nearCheckpoints.forEach(near => {
            console.log(`Have a checkpoint near: ${near._id}`);
            this.io.to(`checkpoint-${near._id}`).emit('trucksnear', location);
          });
        } catch (err) {
          console.error('Erro ao buscar checkpoints próximos:', err);
        }

        // Verifica se dispositivo entrou em área proibida (#11)
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

        // Atualiza cache Redis com TTL (#14)
        try {
          await this.redisClient.set(
            this.cacheSocketKey,
            JSON.stringify(this.locations),
            { EX: REDIS_TTL_SECONDS }
          );
        } catch (err) {
          console.error('Erro ao atualizar cache Redis:', err);
        }

        // Broadcast para demais clientes
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
    return CheckPoint.find({
      gpsLocation: {
        $near: {
          $maxDistance: 2000,
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          }
        }
      }
    }).exec();
  }

  async _findForbiddenAreas(location) {
    return ForbiddenArea.find({
      area: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          }
        }
      }
    }).exec();
  }
}

export default SocketManager;

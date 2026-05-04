import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import SocketManager from './modules/tracking/socket-manager.js';

// --- Helpers de mock ---

function makeSocket(query = {}) {
  const emitted = [];
  const joined = [];
  const broadcastEmitted = [];

  return {
    id: `socket-${Math.random()}`,
    handshake: { query },
    emit(event, data) { emitted.push({ event, data }); },
    join(room) { joined.push(room); },
    broadcast: {
      emit(event, data) { broadcastEmitted.push({ event, data }); }
    },
    on(event, handler) { this._handlers = this._handlers || {}; this._handlers[event] = handler; },
    async trigger(event, data) { return this._handlers?.[event]?.(data); },
    _emitted: emitted,
    _joined: joined,
    _broadcastEmitted: broadcastEmitted
  };
}

function makeIo() {
  const roomEmits = [];
  const rooms = {};
  return {
    on(event, handler) { this._connectionHandler = handler; },
    triggerConnection(socket) { this._connectionHandler(socket); },
    to(room) {
      return {
        emit(event, data) { roomEmits.push({ room, event, data }); }
      };
    },
    _roomEmits: roomEmits
  };
}

function makeRedis(initialData = null) {
  let store = initialData;
  let lastSetOptions = null;
  return {
    async get(key) { return store; },
    async set(key, value, options) { store = value; lastSetOptions = options; },
    _getStore() { return store; },
    _getLastSetOptions() { return lastSetOptions; }
  };
}

// Mock do CheckPoint — injetado via monkey-patch no construtor
class MockCheckPoint {
  static _results = [];
  static async find() { return MockCheckPoint._results; }
}

// Subclasse que injeta checkpoints e forbidden areas mockados
class TestableSocketManager extends SocketManager {
  async _findNearCheckpoints(location) {
    return MockCheckPoint._results;
  }
  async _findForbiddenAreas(location) {
    return MockForbiddenArea._results;
  }
}

// Mock de ForbiddenArea
class MockForbiddenArea {
  static _results = [];
}

// --- Testes ---

describe('SocketManager', () => {

  describe('initialize — carrega cache do Redis', () => {
    it('popula this.locations com dados do Redis se existirem', async () => {
      const cached = [{ idDevice: 'dev1', latitude: -23, longitude: -46 }];
      const redis = makeRedis(JSON.stringify(cached));
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();
      assert.deepEqual(sm.locations, cached);
    });

    it('mantém locations vazio se Redis retornar null', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();
      assert.deepEqual(sm.locations, []);
    });
  });

  describe('connection — on_connect e locations', () => {
    it('emite on_connect e locations com o cache atual apenas para o socket conectado', async () => {
      const cached = [{ idDevice: 'dev1', latitude: -23, longitude: -46 }];
      const redis = makeRedis(JSON.stringify(cached));
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const onConnect = socket._emitted.find(e => e.event === 'on_connect');
      const locations = socket._emitted.find(e => e.event === 'locations');
      assert.ok(onConnect, 'on_connect deve ser emitido');
      assert.deepEqual(onConnect.data, cached);
      assert.ok(locations, 'locations deve ser emitido');
    });
  });

  describe('connection — checkpoint join', () => {
    it('faz join na room checkpoint-<id> quando query.checkpoint está presente', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();

      const socket = makeSocket({ checkpoint: 'cp123' });
      io.triggerConnection(socket);

      assert.ok(socket._joined.includes('checkpoint-cp123'));
      assert.equal(sm.loggedCheckpoints['cp123'], socket.id);
    });

    it('não faz join quando não há checkpoint na query', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      assert.equal(socket._joined.length, 0);
    });
  });

  describe('evento change', () => {
    it('insere nova localização em this.locations', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const location = { idDevice: 'dev1', latitude: -23.5, longitude: -46.6 };
      await socket.trigger('change', location);

      assert.equal(sm.locations.length, 1);
      assert.deepEqual(sm.locations[0], location);
    });

    it('faz upsert quando idDevice já existe em locations', async () => {
      const existing = [{ idDevice: 'dev1', latitude: -20, longitude: -40 }];
      const redis = makeRedis(JSON.stringify(existing));
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const updated = { idDevice: 'dev1', latitude: -23.5, longitude: -46.6 };
      await socket.trigger('change', updated);

      assert.equal(sm.locations.length, 1);
      assert.deepEqual(sm.locations[0], updated);
    });

    it('atualiza o cache Redis após change', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const location = { idDevice: 'dev2', latitude: -10, longitude: -50 };
      await socket.trigger('change', location);

      const stored = JSON.parse(redis._getStore());
      assert.deepEqual(stored, [location]);
    });

    it('faz broadcast para outros clientes via socket.broadcast.emit', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const location = { idDevice: 'dev3', latitude: -15, longitude: -48 };
      await socket.trigger('change', location);

      const broadcast = socket._broadcastEmitted.find(e => e.event === 'locations');
      assert.ok(broadcast, 'deve fazer broadcast de locations');
      assert.deepEqual(broadcast.data, location);
    });

    it('emite trucksnear para room de checkpoint próximo', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [{ _id: 'cp999' }];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const location = { idDevice: 'dev4', latitude: -22, longitude: -43 };
      await socket.trigger('change', location);

      const roomEmit = io._roomEmits.find(e => e.event === 'trucksnear' && e.room === 'checkpoint-cp999');
      assert.ok(roomEmit, 'deve emitir trucksnear para a room do checkpoint');
      assert.deepEqual(roomEmit.data, location);
    });

    it('não emite trucksnear quando não há checkpoints próximos', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      MockForbiddenArea._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      await socket.trigger('change', { idDevice: 'dev5', latitude: -1, longitude: -1 });

      const roomEmit = io._roomEmits.find(e => e.event === 'trucksnear');
      assert.equal(roomEmit, undefined);
    });
  });

  describe('evento change — TTL Redis (#14)', () => {
    it('passa opção EX ao set do Redis', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      MockForbiddenArea._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      await socket.trigger('change', { idDevice: 'devTTL', latitude: -5, longitude: -35 });

      const opts = redis._getLastSetOptions();
      assert.ok(opts && typeof opts.EX === 'number' && opts.EX > 0, 'deve passar EX > 0 ao set do Redis');
    });
  });

  describe('evento change — ForbiddenArea (#11)', () => {
    it('emite forbidden_area_entered para socket e broadcast quando dispositivo está em área proibida', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      MockForbiddenArea._results = [{ name: 'Área Restrita 1', _id: 'fa001' }];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      const location = { idDevice: 'devFA', latitude: -23, longitude: -46 };
      await socket.trigger('change', location);

      const directEmit = socket._emitted.find(e => e.event === 'forbidden_area_entered');
      assert.ok(directEmit, 'deve emitir forbidden_area_entered diretamente ao socket');
      assert.equal(directEmit.data.area.name, 'Área Restrita 1');

      const broadcastEmit = socket._broadcastEmitted.find(e => e.event === 'forbidden_area_entered');
      assert.ok(broadcastEmit, 'deve fazer broadcast de forbidden_area_entered');
    });

    it('não emite forbidden_area_entered quando dispositivo não está em área proibida', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      MockCheckPoint._results = [];
      MockForbiddenArea._results = [];
      await sm.initialize();

      const socket = makeSocket({});
      io.triggerConnection(socket);

      await socket.trigger('change', { idDevice: 'devSafe', latitude: -10, longitude: -50 });

      const emitted = socket._emitted.find(e => e.event === 'forbidden_area_entered');
      assert.equal(emitted, undefined);
    });
  });

  describe('autenticação JWT no handshake (#13)', () => {
    it('rejeita conexão sem token quando jwtVerify está configurado', async () => {
      const redis = makeRedis(null);
      const middlewares = [];
      const io = {
        use(fn) { middlewares.push(fn); },
        on() {}
      };
      const jwtVerify = async (token) => { throw new Error('invalid'); };
      const sm = new TestableSocketManager(io, redis, jwtVerify);
      await sm.initialize();

      assert.equal(middlewares.length, 1, 'deve registrar middleware de auth');

      // Simula socket sem token
      const socket = { handshake: { auth: {} } };
      let nextError = null;
      await middlewares[0](socket, (err) => { nextError = err; });
      assert.ok(nextError instanceof Error);
      assert.equal(nextError.message, 'authentication_required');
    });

    it('rejeita conexão com token inválido', async () => {
      const redis = makeRedis(null);
      const middlewares = [];
      const io = { use(fn) { middlewares.push(fn); }, on() {} };
      const jwtVerify = async (token) => { throw new Error('invalid'); };
      const sm = new TestableSocketManager(io, redis, jwtVerify);
      await sm.initialize();

      const socket = { handshake: { auth: { token: 'bad-token' } } };
      let nextError = null;
      await middlewares[0](socket, (err) => { nextError = err; });
      assert.ok(nextError instanceof Error);
      assert.equal(nextError.message, 'invalid_token');
    });

    it('aceita conexão com token válido e seta socket.user', async () => {
      const redis = makeRedis(null);
      const middlewares = [];
      const io = { use(fn) { middlewares.push(fn); }, on() {} };
      const jwtVerify = async (token) => ({ username: 'admin' });
      const sm = new TestableSocketManager(io, redis, jwtVerify);
      await sm.initialize();

      const socket = { handshake: { auth: { token: 'valid-token' } } };
      let nextError = null;
      await middlewares[0](socket, (err) => { nextError = err || null; });
      assert.equal(nextError, null, 'next deve ser chamado sem erro');
      assert.deepEqual(socket.user, { username: 'admin' });
    });

    it('não registra middleware quando jwtVerify não é passado', async () => {
      const redis = makeRedis(null);
      const middlewares = [];
      const io = { use(fn) { middlewares.push(fn); }, on() {} };
      const sm = new TestableSocketManager(io, redis); // sem jwtVerify
      await sm.initialize();
      assert.equal(middlewares.length, 0);
    });
  });

  describe('disconnect', () => {
    it('remove checkpointId de loggedCheckpoints no disconnect', async () => {
      const redis = makeRedis(null);
      const io = makeIo();
      const sm = new TestableSocketManager(io, redis);
      await sm.initialize();

      const socket = makeSocket({ checkpoint: 'cp-disconnect' });
      io.triggerConnection(socket);

      assert.equal(sm.loggedCheckpoints['cp-disconnect'], socket.id);

      socket.trigger('disconnect');
      assert.equal(sm.loggedCheckpoints['cp-disconnect'], undefined);
    });
  });
});

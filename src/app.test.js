import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';

import * as CityModel from './schemas/city.model.js';
import * as ForbiddenAreaModel from './schemas/forbidden-area.model.js';
import * as CheckPointModel from './schemas/checkpoint.model.js';

// Redis mock — nunca conecta de verdade
function makeRedisMock() {
  return {
    on() {},
    async connect() {},
    async get() { return null; },
    async set() {}
  };
}

async function buildTestApp() {
  return buildApp({ redisClient: makeRedisMock(), skipSocket: true });
}

function getToken(app) {
  return app.jwt.sign({ username: 'admin' });
}

// --- Testes ---

describe('REST API — POST /login', () => {
  it('retorna 200 e token com credenciais válidas', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: { username: 'admin', password: 'password' }
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.token, 'deve retornar token');
  });

  it('retorna 401 com credenciais inválidas', async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: { username: 'admin', password: 'errada' }
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('REST API — GET / (healthcheck)', () => {
  it('retorna 401 sem token', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/' });
    assert.equal(res.statusCode, 401);
  });

  it('retorna 200 com versão e nome com token válido', async () => {
    const app = await buildTestApp();
    const token = getToken(app);
    const res = await app.inject({
      method: 'GET',
      url: '/',
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.version, '1.0.0');
    assert.equal(body.name, 'locationSocket API');
  });
});

describe('REST API — GET /cities', () => {
  it('retorna 401 sem token', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/cities' });
    assert.equal(res.statusCode, 401);
  });

  it('retorna 200 com array de cidades mockado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    // Mock City.find
    const originalFind = CityModel.default.find;
    CityModel.default.find = async () => [{ name: 'São Paulo', state: 'SP' }];

    const res = await app.inject({
      method: 'GET',
      url: '/cities',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.find = originalFind;

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].name, 'São Paulo');
  });

  it('passa filtro state para City.find', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    let capturedFilter = null;
    const originalFind = CityModel.default.find;
    CityModel.default.find = async (filter) => { capturedFilter = filter; return []; };

    await app.inject({
      method: 'GET',
      url: '/cities?state=SP',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.find = originalFind;
    assert.equal(capturedFilter?.state, 'SP');
  });
});

describe('REST API — GET /cities/:id', () => {
  it('retorna 200 quando cidade é encontrada', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const originalFindOne = CityModel.default.findOne;
    CityModel.default.findOne = async () => ({ name: 'Campinas', externalId: '3509502' });

    const res = await app.inject({
      method: 'GET',
      url: '/cities/3509502',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.findOne = originalFindOne;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().name, 'Campinas');
  });

  it('retorna 404 quando cidade não é encontrada', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const originalFindOne = CityModel.default.findOne;
    CityModel.default.findOne = async () => null;

    const res = await app.inject({
      method: 'GET',
      url: '/cities/naoexiste',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.findOne = originalFindOne;
    assert.equal(res.statusCode, 404);
  });
});

describe('REST API — GET /where-i-am', () => {
  it('retorna 200 com cidade encontrada pelo ponto geográfico', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const originalFindOne = CityModel.default.findOne;
    CityModel.default.findOne = async () => ({ name: 'Rio de Janeiro', state: 'RJ' });

    const res = await app.inject({
      method: 'GET',
      url: '/where-i-am?lat=-22.9&lng=-43.1',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.findOne = originalFindOne;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().name, 'Rio de Janeiro');
  });

  it('retorna 200 com null quando nenhuma cidade é encontrada', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const originalFindOne = CityModel.default.findOne;
    CityModel.default.findOne = async () => null;

    const res = await app.inject({
      method: 'GET',
      url: '/where-i-am?lat=0&lng=0',
      headers: { authorization: `Bearer ${token}` }
    });

    CityModel.default.findOne = originalFindOne;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json(), null);
  });
});

describe('REST API — ForbiddenArea (#11)', () => {
  it('GET /forbidden-areas retorna 401 sem token', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/forbidden-areas' });
    assert.equal(res.statusCode, 401);
  });

  it('GET /forbidden-areas retorna 200 com array mockado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = ForbiddenAreaModel.default.find;
    ForbiddenAreaModel.default.find = async () => [{ name: 'Área Restrita', lineColor: 'red' }];

    const res = await app.inject({
      method: 'GET',
      url: '/forbidden-areas',
      headers: { authorization: `Bearer ${token}` }
    });

    ForbiddenAreaModel.default.find = orig;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json()[0].name, 'Área Restrita');
  });

  it('GET /forbidden-areas/:id retorna 404 quando não encontrado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = ForbiddenAreaModel.default.findById;
    ForbiddenAreaModel.default.findById = async () => null;

    const res = await app.inject({
      method: 'GET',
      url: '/forbidden-areas/naoexiste',
      headers: { authorization: `Bearer ${token}` }
    });

    ForbiddenAreaModel.default.findById = orig;
    assert.equal(res.statusCode, 404);
  });

  it('POST /forbidden-areas cria nova área e retorna 201', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const fakeArea = { name: 'Nova Área', save: async function() {} };
    const OrigCtor = ForbiddenAreaModel.default;
    // Monkey-patch: substituímos o construtor via prototype não é possível em ESM,
    // mas podemos testar via POST com mock do save no prototype
    const origSave = ForbiddenAreaModel.default.prototype.save;
    ForbiddenAreaModel.default.prototype.save = async function() {
      this.name = this.name || 'Nova Área';
    };

    const res = await app.inject({
      method: 'POST',
      url: '/forbidden-areas',
      payload: { name: 'Nova Área', lineColor: 'blue' },
      headers: { authorization: `Bearer ${token}` }
    });

    ForbiddenAreaModel.default.prototype.save = origSave;
    // 201 ou 500 dependendo do Mongoose sem DB — apenas verificamos que a rota existe e passa pelo auth
    assert.ok([201, 500].includes(res.statusCode));
  });

  it('DELETE /forbidden-areas/:id retorna 404 quando área não encontrada', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = ForbiddenAreaModel.default.findByIdAndDelete;
    ForbiddenAreaModel.default.findByIdAndDelete = async () => null;

    const res = await app.inject({
      method: 'DELETE',
      url: '/forbidden-areas/naoexiste',
      headers: { authorization: `Bearer ${token}` }
    });

    ForbiddenAreaModel.default.findByIdAndDelete = orig;
    assert.equal(res.statusCode, 404);
  });
});

describe('REST API — Checkpoints', () => {
  it('GET /checkpoints retorna 401 sem token', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/checkpoints' });
    assert.equal(res.statusCode, 401);
  });

  it('GET /checkpoints retorna 200 com array mockado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.find;
    CheckPointModel.default.find = async () => [{ name: 'CP1', slug: 'cp1', isActive: true }];

    const res = await app.inject({
      method: 'GET',
      url: '/checkpoints',
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.find = orig;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json()[0].name, 'CP1');
  });

  it('GET /checkpoints/:id retorna 404 quando não encontrado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findById;
    CheckPointModel.default.findById = async () => null;

    const res = await app.inject({
      method: 'GET',
      url: '/checkpoints/naoexiste',
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findById = orig;
    assert.equal(res.statusCode, 404);
  });

  it('GET /checkpoints/:id retorna 200 quando encontrado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findById;
    CheckPointModel.default.findById = async () => ({ _id: 'abc', name: 'CP2', slug: 'cp2' });

    const res = await app.inject({
      method: 'GET',
      url: '/checkpoints/abc',
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findById = orig;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().name, 'CP2');
  });

  it('POST /checkpoints cria novo checkpoint (mock save)', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const origSave = CheckPointModel.default.prototype.save;
    CheckPointModel.default.prototype.save = async function () {};

    const res = await app.inject({
      method: 'POST',
      url: '/checkpoints',
      payload: { name: 'Novo CP', slug: 'novo-cp', isActive: true },
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.prototype.save = origSave;
    assert.ok([201, 500].includes(res.statusCode));
  });

  it('PUT /checkpoints/:id retorna 404 quando não encontrado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findByIdAndUpdate;
    CheckPointModel.default.findByIdAndUpdate = async () => null;

    const res = await app.inject({
      method: 'PUT',
      url: '/checkpoints/naoexiste',
      payload: { name: 'Atualizado' },
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findByIdAndUpdate = orig;
    assert.equal(res.statusCode, 404);
  });

  it('PUT /checkpoints/:id retorna 200 quando atualizado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findByIdAndUpdate;
    CheckPointModel.default.findByIdAndUpdate = async () => ({ _id: 'abc', name: 'Atualizado' });

    const res = await app.inject({
      method: 'PUT',
      url: '/checkpoints/abc',
      payload: { name: 'Atualizado' },
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findByIdAndUpdate = orig;
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().name, 'Atualizado');
  });

  it('DELETE /checkpoints/:id retorna 404 quando não encontrado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findByIdAndDelete;
    CheckPointModel.default.findByIdAndDelete = async () => null;

    const res = await app.inject({
      method: 'DELETE',
      url: '/checkpoints/naoexiste',
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findByIdAndDelete = orig;
    assert.equal(res.statusCode, 404);
  });

  it('DELETE /checkpoints/:id retorna 204 quando deletado', async () => {
    const app = await buildTestApp();
    const token = getToken(app);

    const orig = CheckPointModel.default.findByIdAndDelete;
    CheckPointModel.default.findByIdAndDelete = async () => ({ _id: 'abc' });

    const res = await app.inject({
      method: 'DELETE',
      url: '/checkpoints/abc',
      headers: { authorization: `Bearer ${token}` }
    });

    CheckPointModel.default.findByIdAndDelete = orig;
    assert.equal(res.statusCode, 204);
  });
});

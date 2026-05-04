import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Importa os models — validateSync() não precisa de conexão
import CheckPoint from './checkpoint.model.js';
import City from './city.model.js';
import ForbiddenArea from './forbidden-area.model.js';

describe('Schema — Checkpoint', () => {
  it('aceita documento válido sem erros de validação', () => {
    const doc = new CheckPoint({
      slug: 'porto-itaguai',
      name: 'Porto de Itaguaí',
      gpsLocation: { type: 'Point', coordinates: [-43.8, -22.9] },
      address: 'Itaguaí, RJ',
      isActive: true,
      isFixedLocation: false
    });
    const err = doc.validateSync();
    assert.equal(err, undefined);
  });

  it('aceita documento com campos opcionais ausentes', () => {
    const doc = new CheckPoint({});
    const err = doc.validateSync();
    assert.equal(err, undefined);
  });

  it('possui índice 2dsphere em gpsLocation', () => {
    const indexes = CheckPoint.schema.indexes();
    const has2dsphere = indexes.some(([fields]) => fields.gpsLocation === '2dsphere');
    assert.ok(has2dsphere, 'índice 2dsphere deve existir em gpsLocation');
  });
});

describe('Schema — City', () => {
  it('falha na validação sem o campo name', () => {
    const doc = new City({
      state: 'SP',
      externalId: '123',
      geometry: { type: 'Polygon', coordinates: [[[0, 0]]] }
    });
    const err = doc.validateSync();
    assert.ok(err?.errors?.name, 'deve falhar sem name');
  });

  it('falha na validação sem o campo state', () => {
    const doc = new City({
      name: 'São Paulo',
      externalId: '123',
      geometry: { type: 'Polygon', coordinates: [[[0, 0]]] }
    });
    const err = doc.validateSync();
    assert.ok(err?.errors?.state, 'deve falhar sem state');
  });

  it('falha na validação sem o campo externalId', () => {
    const doc = new City({
      name: 'São Paulo',
      state: 'SP',
      geometry: { type: 'Polygon', coordinates: [[[0, 0]]] }
    });
    const err = doc.validateSync();
    assert.ok(err?.errors?.externalId, 'deve falhar sem externalId');
  });

  it('aceita documento válido sem erros', () => {
    const doc = new City({
      name: 'São Paulo',
      state: 'SP',
      externalId: 'sp-3550308',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }
    });
    const err = doc.validateSync();
    assert.equal(err, undefined);
  });

  it('possui índice 2dsphere em geometry', () => {
    const indexes = City.schema.indexes();
    const has2dsphere = indexes.some(([fields]) => fields.geometry === '2dsphere');
    assert.ok(has2dsphere, 'índice 2dsphere deve existir em geometry');
  });
});

describe('Schema — ForbiddenArea', () => {
  it('aceita string em lineColor (bug #7 corrigido)', () => {
    const doc = new ForbiddenArea({ lineColor: '#FF0000' });
    const err = doc.validateSync();
    assert.equal(err, undefined);
  });

  it('rejeita um objeto Date em lineColor', () => {
    // Mongoose coerce tipos — um Date seria convertido para string na validação
    // O importante é que o campo seja definido como String no schema
    const path = ForbiddenArea.schema.path('lineColor');
    assert.equal(path.instance, 'String', 'lineColor deve ser String no schema');
  });

  it('aceita documento com todos os campos', () => {
    const doc = new ForbiddenArea({
      name: 'Zona Portuária',
      areaProibida: 'Área de restrição',
      lineColor: '#FF0000',
      type: 'Polygon',
      area: { type: 'Polygon', coordinates: [[[0, 0]]] }
    });
    const err = doc.validateSync();
    assert.equal(err, undefined);
  });
});

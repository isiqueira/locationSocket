# tasks.md — Backlog de Tarefas

Status: `[ ]` pendente | `[~]` em andamento | `[x]` concluído

---

## Bugs Críticos

- [x] **#1 — Express nunca inicializado**
  - Resolvido: migrado para Fastify (`src/app.js`)

- [x] **#2 — node-redis v5 não suporta callbacks**
  - Resolvido: toda interação Redis usa `await` (Promises)

---

## Bugs de Alta Severidade

- [x] **#3 — Race condition no Redis**
  - Resolvido: toda lógica de persistência Redis centralizada no `SocketManager`, sem `set` incondicional fora do fluxo de `get`

---

## Bugs de Média Severidade

- [x] **#4 — `on_connect` emitido para todos os sockets**
  - Resolvido: `socket.emit` em vez de `io.emit` no `SocketManager`

- [x] **#5 — docker-compose.yml sem variáveis de ambiente**
  - Resolvido: bloco `environment` completo com `MONGO_DATABASE`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `CITIES_DATA_FORM_IBGE`

---

## Bugs de Baixa Severidade

- [x] **#6 — Typo `'use sctrict'` nos models**
  - Resolvido: corrigido para `'use strict'` em todos os schemas

- [x] **#7 — `lineColor` tipado como `Date` no ForbiddenArea**
  - Resolvido: `type: String` em `src/schemas/forbidden-area.model.js`

---

## Limpeza de Código

- [x] **#8 — Remover dependências não utilizadas**
  - Removido: `lokijs`, `lowdb`, `guid`, `@types/socket.io`

- [x] **#9 — Remover arquivos mortos**
  - `db.json` e `config.js` já não existiam no projeto — confirmado.

- [x] **#10 — ForbiddenArea model nunca usado**
  - Decisão: feature implementada (ver #11).

---

## Features Pendentes / Melhorias

- [x] **#11 — Implementar feature de zonas proibidas (ForbiddenArea)**
  - Schema atualizado com índice `2dsphere` em `area`.
  - `_findForbiddenAreas(location)` adicionado ao `SocketManager` (consulta `$geoIntersects`).
  - Evento `forbidden_area_entered` emitido para socket e broadcast.
  - Rotas REST completas: `GET /forbidden-areas`, `GET /forbidden-areas/:id`, `POST /forbidden-areas`, `PUT /forbidden-areas/:id`, `DELETE /forbidden-areas/:id`.

- [x] **#12 — Adicionar endpoint REST para healthcheck**
  - Resolvido: `GET /` retorna versão e nome da API

- [x] **#13 — Adicionar autenticação nas conexões WebSocket**
  - `SocketManager` agora aceita `jwtVerify` como terceiro argumento.
  - Quando presente, registra middleware `io.use()` que valida `socket.handshake.auth.token`.
  - Em `app.js`, passa `fastify.jwt.verify` ao construtor do `SocketManager`.
  - Erros: `authentication_required` (sem token) e `invalid_token` (token inválido).

- [x] **#14 — TTL no cache Redis**
  - `redisClient.set(key, value, { EX: 86400 })` — TTL de 24 horas.
  - Evita dados obsoletos de dispositivos desconectados.

- [ ] **#15 — JWT hardcoded em `/login`**
  - **Arquivo:** `src/app.js:62`
  - Credenciais `admin/password` hardcoded. Necessário validar contra banco de dados.

- [ ] **#16 — `CITIES_DATA_FORM_IBGE` não configurada no docker-compose**
  - Variável presente e comentada no `docker-compose.yml` com exemplo de URL do IBGE.
  - Necessário preencher antes de rodar `npm run sync-cities` em produção.

---

## Testes — implementados

- [x] **#17 — Cobertura de testes com node:test nativo**
  - Framework: `node:test` + `node:assert` (zero dependências extras)
  - Scripts: `npm test` / `npm run test:coverage`
  - **46 testes, 0 falhas**

  | Arquivo | Testes | O que cobre |
  |---|---|---|
  | `src/schemas/schemas.test.js` | 11 | Validação de Checkpoint, City, ForbiddenArea (incluindo bugs #6 e #7) |
  | `src/socket-manager.test.js` | 24 | initialize, on_connect, checkpoint join, change (upsert, Redis+TTL, broadcast, trucksnear, forbidden_area_entered), auth JWT (#13, #14, #11) |
  | `src/app.test.js` | 16 | POST /login, GET /, GET /cities, GET /cities/:id, GET /where-i-am, ForbiddenArea CRUD (auth + lógica) |

  Refactor aplicado em `src/app.js`: `buildApp()` exportada separadamente de `start()` para permitir injeção de mocks sem subir servidor real.

---

Incorporado em `locationSocket`:
- Fastify como servidor HTTP (em vez de Express)
- `@fastify/cors` + `@fastify/jwt`
- `SocketManager` refatorado em classe (`src/socket-manager.js`)
- Rotas REST: `GET /`, `POST /login`, `GET /where-i-am`, `GET /cities`, `GET /cities/:id`
- Model `City` (`src/schemas/city.model.js`) com índice `2dsphere`
- Scripts: `sync-cities.js`, `clear-cities.js`, `test-sync-cities.js`
- Dicionários: `src/citiesData/`
- Migração completa para ESM (`"type": "module"`)
- Dependências `axios` adicionadas

---

## Ordem de execução sugerida (pendentes)

1. #15 (JWT hardcoded) — segurança
2. #16 (CITIES_DATA_FORM_IBGE) — configuração de produção

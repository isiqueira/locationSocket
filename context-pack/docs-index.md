# docs-index.md — Índice de Documentação

Espinha dorsal de referências para trabalhar no locationSocket. Para cada tecnologia: propósito no projeto, o que consultar e onde.

---

## Socket.IO

**Versão usada:** `^4.8.1`
**Papel:** Toda a comunicação cliente-servidor. Eventos, rooms, broadcast.

| O que consultar | Query sugerida para context7 |
|---|---|
| Emitir para room específica | `emit to room socket.io v4` |
| Emitir só para o socket conectado | `emit to specific socket server-side` |
| Query params na conexão | `handshake query parameters socket.io` |
| Namespace vs Room | `namespace vs room socket.io` |

**ID context7:** resolver com `npx ctx7@latest library "Socket.IO" "emit to room"`

---

## Mongoose / MongoDB

**Versão usada:** `^9.1.5` (Mongoose), MongoDB latest
**Papel:** Persistência de Checkpoints com índice geoespacial `2dsphere`.

| O que consultar | Query sugerida |
|---|---|
| Query `$near` com `$maxDistance` | `mongoose $near geospatial query maxDistance` |
| Índice 2dsphere | `mongoose schema index 2dsphere geospatial` |
| GeoJSON Point schema | `mongoose geojson point schema definition` |

**ID context7:** resolver com `npx ctx7@latest library "Mongoose" "geospatial near query"`

---

## Redis (node-redis)

**Versão usada:** `^5.11.0`
**Papel:** Cache do estado atual de todas as localizações (`CacheDataSocket`).

| O que consultar | Query sugerida |
|---|---|
| API `get`/`set` v5 | `node-redis v5 get set string` |
| Criar client com host/port/password | `node-redis createClient options host port password` |
| Promises vs callbacks (v5 usa promises) | `node-redis v5 async await promises` |

> **Atenção:** O código atual usa a API de **callbacks** do Redis (`redisClient.get(key, callback)`). O `node-redis` v5 usa **Promises**. Isso é um bug latente — a API de callback foi removida. Ver `tasks.md`.

**ID context7:** resolver com `npx ctx7@latest library "node-redis" "createClient get set"`

---

## Express

**Versão usada:** `^5.2.1`
**Papel:** Declarado como dependência, mas **nunca inicializado no código**. Bug crítico — ver `tasks.md` item #1.

| O que consultar | Query sugerida |
|---|---|
| Inicializar app com http.Server | `express with http createServer socket.io` |

---

## Docker / Docker Compose

**Papel:** Orquestração de ambiente completo (app + Redis + MongoDB).

| O que consultar | Query sugerida |
|---|---|
| Passar variáveis de ambiente | `docker-compose env_file environment variables` |
| Dependência entre serviços | `docker-compose depends_on healthcheck` |

---

## Referências internas

| Documento | Localização |
|---|---|
| Análise completa do codebase | Gerada na sessão inicial — ver histórico do chat |
| Schema Checkpoints | `src/schemas/checkpoint.model.js` |
| Schema ForbiddenArea | `src/schemas/forbidden-area.model.js` (não usado) |
| Entry point principal | `src/app.js` |
| Variáveis de ambiente | `.env` (gitignored, criar manualmente) |

---

## Diagrama de fluxo de dados

```
[Dispositivo GPS]
    | emit("change", { idDevice, lat, lng })
    v
[Socket.IO Server — src/app.js]
    |
    |-- MongoDB $near query --> [Checkpoints collection]
    |        |
    |        v
    |   emit("trucksnear") --> [Room checkpoint-<id>] --> [Cliente checkpoint]
    |
    |-- Redis GET/SET CacheDataSocket
    |
    └-- broadcast.emit("locations") --> [Todos os outros clientes]

[Novo cliente conectando]
    | connect(?checkpoint=<id>)
    v
[Socket.IO Server]
    |-- Redis GET --> emit("on_connect", cachedLocations) --> [Cliente]
    |-- socket.join("checkpoint-<id>")
    └-- emit("locations", locations[]) --> [Cliente]
```

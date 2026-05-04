# project-map.md — Mapa do Projeto locationSocket

## O que é este projeto

**locationSocket** é um servidor de rastreamento GPS em tempo real para veículos/dispositivos (contexto: logística de frota). Ele recebe atualizações de posição via WebSocket, armazena o estado atual em Redis, persiste checkpoints geográficos no MongoDB e notifica clientes quando um veículo entra num raio de 2.000 metros de um checkpoint registrado. Não há API REST — toda a comunicação é via Socket.IO.

---

## Mapa de Pastas

```
locationSocket/
│
├── src/                          # Código-fonte da aplicação
│   ├── app.js                    # Entry point: Fastify + Socket.IO + Redis + Mongoose + rotas REST
│   ├── socket-manager.js         # Classe SocketManager — toda a lógica de eventos WebSocket
│   ├── sync-cities.js            # Script: sincroniza cidades do IBGE (GeoJSON) para o MongoDB
│   ├── clear-cities.js           # Script: remove a coleção Cities do MongoDB
│   ├── test-sync-cities.js       # Script: executa syncCitiesFromDictionary com conexão própria
│   ├── citiesData/               # Dicionários de estados brasileiros
│   │   ├── states.dictionary.js  # Mapa sigla → arquivo GeoJSON
│   │   └── states-names.dictionary.js  # Mapa sigla → nome completo
│   └── schemas/                  # Models Mongoose (schemas do MongoDB)
│       ├── checkpoint.model.js   # Coleção Checkpoints — dados geográficos dos postos de controle
│       ├── city.model.js         # Coleção Cities — municípios brasileiros com geometria 2dsphere
│       └── forbidden-area.model.js  # Coleção ForbiddenArea — DEFINIDO, NUNCA USADO
│
├── context-pack/                 # Contexto para agentes de IA (esta pasta)
│
├── config.js                     # Exporta MONGO_DATABASE — NUNCA importado em nenhum lugar
├── db.json                       # Arquivo vazio — resquício de uma tentativa com lowdb
│
├── docker-compose.yml            # Sobe app + Redis + MongoDB em containers
├── Dockerfile                    # Imagem Node 20, roda como usuário não-root
│
├── .github/
│   ├── dependabot.yml            # Atualização automática de deps (npm + actions, daily)
│   └── workflows/
│       ├── build.yml             # CI: npm install + build na master
│       └── docker-build.yml      # CI: docker build na master
│
├── .idx/
│   └── dev.nix                   # Config do Firebase IDX (Google cloud IDE) — ignorar
│
├── package.json                  # Manifesto npm
├── package-lock.json             # Lock file
└── .gitignore
```

---

## Entradas, Saídas e Configurações

## O que o servidor expõe

### WebSocket (Socket.IO)
- **`change`** ← dispositivo envia `{ idDevice, latitude, longitude }`
- **`on_connect`** → cache completo de localizações para o cliente que acabou de conectar
- **`locations`** → array completo ou localização individual em broadcast
- **`trucksnear`** → emitido para a room `checkpoint-<id>` quando veículo está a < 2km
- **Query string na conexão** — `?checkpoint=<mongo_id>` registra o socket como ouvinte de um checkpoint

### REST (Fastify)
| Método | Rota | Auth JWT | Descrição |
|---|---|---|---|
| `POST` | `/login` | Não | Gera token JWT |
| `GET` | `/` | Sim | Versão da API |
| `GET` | `/where-i-am?lat=&lng=` | Sim | Retorna cidade pelo ponto geográfico |
| `GET` | `/cities?state=&name=` | Sim | Lista cidades com filtros opcionais |
| `GET` | `/cities/:id` | Sim | Retorna cidade por `externalId` |

### Configuração (variáveis de ambiente — arquivo `.env` na raiz)
```env
MONGO_DATABASE=mongodb://localhost:27017/locationdb
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_USERNAME=
PORT=4000
JWT_SECRET=changeme
CITIES_DATA_FROM_IBGE=https://url-base-do-ibge/geojson
```
O `.env` é **gitignored** e **não está no docker-compose.yml** — deve ser criado manualmente.

---

## O que NAO mexer

| Item | Motivo |
|---|---|
| `package-lock.json` | Nunca editar manualmente — usar `npm install` / `npm update` |
| `.github/workflows/` | Pipelines de CI — só alterar se mudança arquitetural exigir |
| `db.json` | Arquivo morto — não usar, não deletar sem validar impacto |
| `config.js` | Módulo órfão — não está sendo usado; qualquer alteração não tem efeito |
| Índice `2dsphere` no schema de Checkpoints | Remover quebra todas as queries `$near` do MongoDB |
| Room naming `checkpoint-<id>` | Convenção usada em dois lugares (`join` e `emit`) — renomear exige mudança sincronizada |

---

## Dependências instaladas mas nao usadas

`lokijs`, `lowdb`, `guid`, `@types/socket.io` — presentes no `package.json` mas sem nenhuma referência no código. Podem ser removidas com `npm uninstall` sem risco.

# Logistics Location Tracking API

Real-time geolocation backend for operational tracking, checkpoints and forbidden-area detection.

This project demonstrates how to handle live location updates using Socket.IO, Fastify, Redis and MongoDB geospatial queries. It can be used as a reference architecture for logistics dashboards, fleet tracking, field operations, delivery monitoring or WMS-related mobile workflows.

## Why this project matters

Real-time location systems are common in logistics and field operations, but they require more than simple WebSocket broadcasting.

This project explores concerns such as:

- Live location updates
- Device/checkpoint communication
- Geospatial queries
- Forbidden-area detection
- Redis-based caching
- JWT-based socket authentication
- Dockerized local infrastructure
- API endpoints for operational data

## Tech stack

- Node.js
- Fastify
- Socket.IO
- MongoDB / Mongoose
- Redis
- JWT
- Docker
- Docker Compose
- GitHub Actions

## REST API

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Returns a JWT token for local development authentication |

### Cities

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cities` | Lists cities, optionally filtered by state or name |
| GET | `/cities/:id` | Gets a city by external id |
| GET | `/where-i-am?lat=&lng=` | Finds the city that intersects a given coordinate |

### Forbidden areas

| Method | Endpoint | Description |
|---|---|---|
| GET | `/forbidden-areas` | Lists forbidden areas |
| GET | `/forbidden-areas/:id` | Gets a forbidden area by id |
| POST | `/forbidden-areas` | Creates a forbidden area |
| PUT | `/forbidden-areas/:id` | Updates a forbidden area |
| DELETE | `/forbidden-areas/:id` | Deletes a forbidden area |

### Checkpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/checkpoints` | Lists checkpoints |
| GET | `/checkpoints/:id` | Gets a checkpoint by id |
| POST | `/checkpoints` | Creates a checkpoint |
| PUT | `/checkpoints/:id` | Updates a checkpoint |
| DELETE | `/checkpoints/:id` | Deletes a checkpoint |

## Socket.IO events

### Client emits: `change`

Sends a live location update.

```json
{
  "idDevice": "truck-001",
  "latitude": -23.55052,
  "longitude": -46.633308,
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```
Server emits: locations

Broadcasts location updates to connected clients.

Server emits: trucksnear

Notifies a checkpoint room when a device is near a checkpoint.

Server emits: forbidden_area_entered

Notifies clients when a device enters a forbidden area.

Running locally

Clone the repository:
```bash
git clone https://github.com/isiqueira/locationSocket.git
cd locationSocket
```
Install dependencies:
```bash
npm install
```
Start the backend:
```bash
npm start
```
Or run in development mode:
```bash
npm run start:dev
```
Running with Docker
```bash
docker compose up --build
```
Stop the environment:
```bash
docker compose down
```
Environment variables

Create a .env file based on .env.example.

PORT=4000
MONGO_DATABASE=mongodb://localhost:27017/locationdb
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=change-this-secret
CITIES_DATA_FROM_IBGE=https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson
Engineering notes

Real-time tracking systems require attention to:

Network instability
Duplicate events
Event ordering
Data privacy
Socket authentication
Horizontal scaling
Geospatial query performance
Observability
Message throttling

For production usage, this project should evolve with stronger authentication, explicit CORS configuration, input validation, rate limiting, structured logging, monitoring and deployment documentation.

Project status

Experimental / reference project.

This repository is intended to demonstrate real-time communication and geospatial tracking patterns for logistics and field operation scenarios.

Author

Italo Siqueira

Senior Software Engineer focused on enterprise systems, distributed architecture, integrations, logistics/WMS and technical leadership.

LinkedIn: https://www.linkedin.com/in/italo-araujo-siqueira
GitHub: https://github.com/isiqueira
Website: https://italosiqueira.dev
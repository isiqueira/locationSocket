# locationsTests

[![Docker Image CI](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/docker-build.yml/badge.svg)](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/docker-build.yml)
[![Build CI](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/build.yml/badge.svg)](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/build.yml)
[![SonarQube Scan](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/sonarqube.yml/badge.svg)](https://github.com/Araujo-Siqueira-Consultoria/locationsTests/actions/workflows/sonarqube.yml)

# Real-time Location Tracking with Socket.IO

A real-time location tracking experiment built with Node.js, Socket.IO and Docker.

This project demonstrates how to receive, process and broadcast location updates in real time using WebSockets. It can be used as a foundation for fleet tracking, delivery monitoring, field service applications, logistics dashboards or any system that needs live geolocation updates.

## Purpose

The goal of this repository is to explore a simple but extensible architecture for real-time location communication between clients and a backend service.

It focuses on:

- Real-time communication with WebSockets
- Location update broadcasting
- Socket.IO event handling
- Containerized local development
- Backend structure for future expansion
- CI/CD-ready project organization

## Use cases

This project can be adapted for scenarios such as:

- Delivery tracking
- Fleet monitoring
- Field team location updates
- Real-time logistics dashboards
- Mobile app geolocation synchronization
- Internal operational control panels

## Tech stack

- Node.js
- Socket.IO
- JavaScript
- Docker
- Docker Compose
- GitHub Actions
- Vercel

## Main features

- WebSocket-based communication
- Real-time location event handling
- Client-server communication using Socket.IO
- Dockerized development environment
- Basic project structure for real-time applications
- CI/CD workflow foundation

## Architecture overview

The application follows a simple real-time communication model:

```text
Client / Mobile App / Browser
        |
        | location update event
        v
Socket.IO Server
        |
        | broadcast event
        v
Connected Clients / Dashboard / Consumers
```
The backend receives location updates from connected clients and broadcasts them to other listeners in real time.

This approach can evolve to support:

Authentication
User/device identification
Room-based tracking
Redis adapter for horizontal scaling
Persistent location history
Geofencing
Event auditing
Observability and metrics
Getting started
Prerequisites

Make sure you have installed:

Node.js
npm
Docker
Docker Compose
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
Start the application:
```bash
npm start
```
If the project uses a development script, run:
```bash
npm run dev
```
Running with Docker

Build and start the containers:
```bash
docker compose up --build
```
Stop the containers:
```bash
docker compose down
```
Environment variables

Create a .env file based on the example below:
```text
PORT=3000
NODE_ENV=development
```
Adjust the values according to your local environment.

Example Socket.IO events
Sending a location update
```typescript
socket.emit("location:update", {
  userId: "user-123",
  latitude: -23.55052,
  longitude: -46.633308,
  timestamp: new Date().toISOString()
});
```
Listening for location updates
```typescript
socket.on("location:updated", (payload) => {
  console.log("Location updated:", payload);
});
```
Suggested event model
```json
{
  "userId": "user-123",
  "deviceId": "device-456",
  "latitude": -23.55052,
  "longitude": -46.633308,
  "accuracy": 12,
  "speed": 24.5,
  "heading": 180,
  "timestamp": "2026-05-04T10:00:00.000Z"
}
```
Possible improvements

This repository can be extended with:

JWT authentication
Device/session management
Redis adapter for Socket.IO scaling
PostgreSQL or MongoDB persistence
Location history
Geofencing rules
Admin dashboard
Rate limiting
OpenTelemetry instrumentation
Structured logging
Automated tests
Deployment documentation
Engineering notes

Real-time location systems require attention to:

Network instability
Duplicate events
Event ordering
Battery consumption on mobile devices
Message throttling
Data privacy
Horizontal scaling
Observability

For production usage, this project should evolve to include authentication, authorization, data persistence, monitoring, retry policies and infrastructure-level scalability.

Project status

Experimental / reference project.

This repository is intended to demonstrate real-time communication patterns and serve as a base for more complete tracking and logistics-related solutions.

Author

Italo Siqueira
Senior Software Engineer focused on enterprise systems, distributed architecture, integrations, logistics/WMS and technical leadership.

LinkedIn: https://www.linkedin.com/in/italo-araujo-siqueira
GitHub: https://github.com/isiqueira
Website: https://italosiqueira.dev

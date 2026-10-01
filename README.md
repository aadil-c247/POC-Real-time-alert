# Real-Time Alert Matching POC

## Objective

Match high-frequency product events against user alert
configurations without scanning all users for every event.

## Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Docker

## Architecture

Product Event
     ↓
Fastify Route
     ↓
Matching Service
     ↓
PostgreSQL indexed matching
     ↓
Notification Service
     ↓
Bulk notification + deduplication
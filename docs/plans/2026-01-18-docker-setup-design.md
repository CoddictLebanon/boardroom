# Docker Setup Design

## Overview

Full Docker containerization of the Chairboard project for isolation from other projects on the same machine.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Docker Network: chairboard              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  postgres   │    │     api     │    │     web     │ │
│  │   :5432     │◄───│   :3001     │◄───│   :3000     │ │
│  │             │    │   NestJS    │    │   Next.js   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│        │                  │                  │         │
│        ▼                  ▼                  ▼         │
│   [pgdata vol]     [./apps/api]       [./apps/web]    │
│   (persistent)     (hot-reload)       (hot-reload)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
    localhost:5433     localhost:3001     localhost:3000
```

## Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Database | PostgreSQL 16 in Docker | Full isolation |
| External DB Port | 5433 | Avoid conflict with local PostgreSQL |
| Mode | Development | Hot-reloading for active development |
| Data | Migrated from local | Preserve existing data |
| Restart Policy | unless-stopped | Containers stay running |

## Services

### PostgreSQL
- Image: postgres:16
- Internal port: 5432
- External port: 5433
- Volume: pgdata (named volume for persistence)

### API (NestJS)
- Custom Dockerfile.dev
- Port: 3001
- Source mounted for hot-reload
- Imports ./apps/api/.env
- DATABASE_URL overridden to use Docker postgres

### Web (Next.js)
- Custom Dockerfile.dev
- Port: 3000
- Source mounted for hot-reload
- Imports ./apps/web/.env.local

## Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (reset database)
docker compose down -v
```

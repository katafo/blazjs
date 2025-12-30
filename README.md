# Blazjs

A minimal, modular framework for building Express servers with TypeScript.

## Overview

Blazjs provides a collection of packages that work together to help you build robust, production-ready Express applications. Each package is designed to handle a specific concern and can be used independently or combined as needed.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [@blazjs/common](./packages/common) | Core utilities: routing, validation, logging, error handling | 0.0.5 |
| [@blazjs/auth](./packages/auth) | JWT authentication with token blacklisting | 0.0.5 |
| [@blazjs/cache](./packages/cache) | Redis caching with JSON support | 0.0.5 |
| [@blazjs/datasource](./packages/datasource) | TypeORM wrapper with master/slave support | 0.0.5 |
| [@blazjs/queue](./packages/queue) | BullMQ job queue processing | 0.0.5 |

## Installation

Install individual packages as needed:

```bash
npm install @blazjs/common
npm install @blazjs/auth
npm install @blazjs/cache
npm install @blazjs/datasource
npm install @blazjs/queue
```

## Package Details

### @blazjs/common

Core package providing:
- `Server` - Express server wrapper with middleware setup
- `BaseRoute` - Abstract route class with validation support
- `Logger` - Winston-based logging with caller info
- `ValidationPipe` - Request validation using class-validator
- Error handling middleware

### @blazjs/auth

JWT authentication featuring:
- Access and refresh token generation
- Token verification and refresh
- Token blacklisting via Redis cache
- Configurable expiration times

### @blazjs/cache

Redis caching with:
- Key-value string operations
- JSON document operations (RedisJSON)
- TTL support
- Connection management

### @blazjs/datasource

TypeORM integration with:
- Master/slave connection management
- Automatic query routing (writes to master, reads to slaves)
- Transaction support
- Query logging and error handling

### @blazjs/queue

BullMQ job processing with:
- Abstract job processor class
- Cron job scheduling
- Output queue chaining
- Bull Board dashboard with auth
- Worker concurrency control

## Development

This is a monorepo managed with Lerna and Yarn workspaces.

```bash
# Install dependencies
yarn install

# Build all packages
yarn lerna:build

# Run tests for a specific package
cd packages/common && yarn test

# Publish packages
yarn lerna:publish
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.0
- Redis (for cache, auth blacklisting, and queue)
- PostgreSQL/MySQL (for datasource)

## License

MIT

# @blazjs/cache

A Redis cache service for Blazjs with support for multiple data structures including strings, hashes, JSON, sets, sorted sets, and lists.

## Installation

```bash
npm install @blazjs/cache
```

## Requirements

- Redis server (for JSON operations, requires [RedisJSON](https://redis.io/docs/stack/json/) module)
- Node.js >= 16

## Usage

### Basic Setup

```typescript
import { RedisCacheService } from "@blazjs/cache";

const cache = new RedisCacheService({
  host: "localhost",
  port: 6379,
  password: "your-password", // optional
});

// Don't forget to disconnect when done
await cache.disconnect();
```

### String Operations

```typescript
// Set value
await cache.set("key", "value");

// Set with TTL (in seconds)
await cache.set("key", "value", 3600);

// Get value
const value = await cache.get("key");

// Delete key
await cache.del("key");

// Check if key exists
const exists = await cache.exist("key");
```

### Hash Operations

```typescript
// Set hash field
await cache.hset("user:1", "name", "John");

// Get hash field
const name = await cache.hget("user:1", "name");

// Get all fields
const user = await cache.hgetall("user:1");

// Check if field exists
const exists = await cache.hexists("user:1", "name");

// Delete fields
await cache.hdel("user:1", ["name", "email"]);
```

### JSON Operations

Requires RedisJSON module.

```typescript
// Set JSON object
await cache.jsonset("user:1", { name: "John", age: 30 });

// Set with path
await cache.jsonset("user:1", "Jane", "name");

// Set with TTL
await cache.jsonset("user:1", { name: "John" }, undefined, 3600);

// Get JSON object
const user = await cache.jsonget<{ name: string; age: number }>("user:1");

// Get nested path
const name = await cache.jsonget<string>("user:1", "name");

// Batch set
await cache.jsonmset([
  { key: "user:1", object: { name: "John" } },
  { key: "user:2", object: { name: "Jane" } },
]);

// Batch get
const users = await cache.jsonmget<User>(["user:1", "user:2"]);
```

### Set Operations

```typescript
// Add member
await cache.sadd("tags", "typescript");

// Check if member exists
const isMember = await cache.sismember("tags", "typescript");

// Check multiple members
const results = await cache.sismembers("tags", ["typescript", "javascript"]);

// Remove member
await cache.srem("tags", "typescript");
```

### Sorted Set Operations

```typescript
import { Pagination } from "@blazjs/common";

// Add member with score
await cache.zadd("leaderboard", "player1", 100);

// Batch add
await cache.zmadd([
  { key: "leaderboard", member: "player1", score: 100 },
  { key: "leaderboard", member: "player2", score: 200 },
]);

// Get rank (0-indexed, lowest score first)
const rank = await cache.zrank("leaderboard", "player1");

// Get reverse rank (highest score first)
const revRank = await cache.zrevrank("leaderboard", "player1");

// Get score
const score = await cache.zscore("leaderboard", "player1");

// Get count
const count = await cache.zcard("leaderboard");

// Get count in score range
const rangeCount = await cache.zcount("leaderboard", 0, 100);

// Get members by score (descending) with pagination
const pagination = new Pagination({ page: 1, limit: 10 });
const members = await cache.zrevrange("leaderboard", pagination);

// Remove member
await cache.zrem("leaderboard", "player1");

// Remove multiple members
await cache.zrems("leaderboard", ["player1", "player2"]);

// Remove by rank range
await cache.zremrangebyrank("leaderboard", 0, 10);

// Scan members
const [cursor, elements] = await cache.zscan("leaderboard", "player*");
```

### List Operations

```typescript
// Push to left (default)
await cache.push("queue", { task: "process" });

// Push to right
await cache.push("queue", { task: "process" }, "right");

// Get range (all items)
const items = await cache.range("queue");

// Get range with limit
const limitedItems = await cache.range("queue", 10);

// Pop from left (default)
const item = await cache.pop("queue");

// Pop from right
const lastItem = await cache.pop("queue", "right");

// Get length
const length = await cache.length("queue");

// Trim list
await cache.trim("queue", 0, 99); // Keep first 100 items
```

### Batch Expire

```typescript
// Set TTL for multiple keys
await cache.mexpire([
  { key: "key1", ttl: 3600 },
  { key: "key2", ttl: 7200 },
]);
```

## Providers

The package exports provider interfaces for dependency injection:

```typescript
import {
  CacheProvider,
  HashCacheProvider,
  JsonCacheProvider,
  SetCacheProvider,
  SortedSetCacheProvider,
  ListCacheProvider,
} from "@blazjs/cache";
```

## API Reference

### Constructor

```typescript
new RedisCacheService(options: RedisOptions)
```

Options are passed directly to [ioredis](https://github.com/redis/ioredis#connect-to-redis).

### Properties

- `redisClient`: Direct access to the underlying ioredis client

## License

MIT

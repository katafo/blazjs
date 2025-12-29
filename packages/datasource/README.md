# @blazjs/datasource

A TypeORM wrapper for Blazjs with simplified API, transaction support, and auto-reconnection.

## Installation

```bash
npm install @blazjs/datasource
```

## Requirements

- Node.js >= 16
- TypeORM ^0.3.x
- A supported database driver (pg, mysql2, sqlite3, etc.)

## Usage

### Basic Setup

```typescript
import { TypeOrmDataSource } from "@blazjs/datasource";
import { DefaultLogger } from "@blazjs/common";

const datasource = new TypeOrmDataSource(
  {
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "user",
    password: "password",
    database: "mydb",
    entities: [User, Post],
    synchronize: false,
  },
  new DefaultLogger()
);

// Initialize connection
await datasource.initialize();

// Close connection when done
await datasource.close();
```

### Transactions

```typescript
const result = await datasource.transaction(async (manager) => {
  const user = await manager.save(User, { name: "John" });
  const post = await manager.save(Post, { title: "Hello", userId: user.id });
  return { user, post };
});
```

### Query Modes

The `query` method supports different modes for read/write splitting:

```typescript
// Use slave (read replica) - default
const users = await datasource.query("slave", async (manager) => {
  return manager.find(User);
});

// Use master (for writes or consistent reads)
const user = await datasource.query("master", async (manager) => {
  return manager.findOne(User, { where: { id: 1 } });
});

// Use existing EntityManager (for queries within a transaction)
await datasource.transaction(async (manager) => {
  const user = await datasource.query(manager, async (m) => {
    return m.findOne(User, { where: { id: 1 } });
  });
});
```

### Migrations

```typescript
// Run all pending migrations
await datasource.runMigration();

// Run with options
await datasource.runMigration({
  transaction: "each", // "all" | "none" | "each"
  fake: false,
});
```

### Connection Health Check

```typescript
const isConnected = await datasource.isConnected();
if (!isConnected) {
  console.log("Database connection lost");
}
```

### Auto-Reconnection

```typescript
// Check connection every 30 seconds and reconnect if needed
const intervalId = datasource.reconnect(30000);

// Stop auto-reconnection
clearInterval(intervalId);
```

## Repository Pattern

Use `TypeOrmRepos` for a repository-based approach:

```typescript
import { TypeOrmRepos } from "@blazjs/datasource";

class UserRepository extends TypeOrmRepos<User> {
  constructor(datasource: TypeOrmDataSource) {
    super(User, datasource);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async createWithPosts(userData: CreateUserDto): Promise<User> {
    return this.transaction(async (manager) => {
      const user = await manager.save(User, userData);
      await manager.save(Post, { userId: user.id, title: "Welcome" });
      return user;
    });
  }
}

const userRepo = new UserRepository(datasource);
const user = await userRepo.findByEmail("john@example.com");
```

## Custom Logger

The package integrates with `@blazjs/common` Logger for query logging:

```typescript
import { DefaultLogger } from "@blazjs/common";

const logger = new DefaultLogger();
const datasource = new TypeOrmDataSource(options, logger);

// Queries are logged at DEBUG level
// Slow queries are logged at WARN level
// Query errors are logged at ERROR level
```

## API Reference

### TypeOrmDataSource

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize the database connection |
| `transaction(handler)` | Execute operations within a transaction |
| `query(mode, handler)` | Execute query with specified mode (slave/master/EntityManager) |
| `runMigration(options?)` | Run database migrations |
| `close()` | Close the database connection |
| `isConnected()` | Check if connection is alive |
| `reconnect(ms)` | Start auto-reconnection interval |

### TypeOrmRepos<T>

Extends TypeORM's `Repository<T>` with:

| Method | Description |
|--------|-------------|
| `transaction(handler)` | Execute operations within a transaction |

### Properties

- `source`: Direct access to the underlying TypeORM DataSource
- `datasource`: Reference to TypeOrmDataSource (in TypeOrmRepos)

## License

MIT

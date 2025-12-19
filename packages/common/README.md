# @blazjs/common

A minimal boilerplate for building Express.js servers with TypeScript. Provides essential utilities including app configuration, routing, request validation, logging, and error handling.

## Installation

```bash
npm install @blazjs/common
# or
yarn add @blazjs/common
```

## Quick Start

```typescript
import { App, BaseRoute, Request, DataRequestDTO } from "@blazjs/common";

// Define a route
class UsersRoute extends BaseRoute {
  route = "users";

  constructor() {
    super();
    this.router.get("/", this.getUsers.bind(this));
  }

  @Request()
  getUsers(data: DataRequestDTO) {
    return { users: [] };
  }
}

// Create and start the app
const app = new App();
app.registerRoutes({
  version: "v1",
  routes: [new UsersRoute()],
});
app.listen(3000);
```

## Features

### App

The main application class that wraps Express.js with sensible defaults.

```typescript
import { App } from "@blazjs/common";

const app = new App({
  // Enable trust proxy (default: true)
  trustProxy: true,

  // CORS configuration
  cors: {
    enabled: true,
    options: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  },

  // Helmet security headers
  helmet: {
    enabled: true,
    options: {
      contentSecurityPolicy: false,
    },
  },

  // Health check endpoint (default: enabled at /health)
  healthCheck: {
    enabled: true,
    path: "/health",
  },

  // Request timeout in milliseconds (default: 30000)
  requestTimeout: 30000,

  // Custom logger (optional)
  logger: customLogger,
});

// Register middlewares
app.registerMiddlewares(authMiddleware, loggingMiddleware);

// Register routes
app.registerRoutes({
  version: "v1",
  routes: [new UsersRoute(), new ProductsRoute()],
  groups: [
    {
      group: "admin",
      routes: [new AdminUsersRoute()],
    },
  ],
});

// Register custom error handler (optional)
app.registerErrorHandler(customErrorHandler);

// Start server
await app.listen(3000);

// Graceful shutdown
await app.close();
```

### Routes

Define routes by extending `BaseRoute`:

```typescript
import { BaseRoute } from "@blazjs/common";
import { RequestHandler } from "express";

class ProductsRoute extends BaseRoute {
  route = "products"; // Route path: /products

  constructor() {
    super();
    this.router.get("/", this.list.bind(this));
    this.router.get("/:id", this.getById.bind(this));
    this.router.post("/", this.create.bind(this));
  }

  list: RequestHandler = (req, res) => {
    res.json({ products: [] });
  };

  getById: RequestHandler = (req, res) => {
    res.json({ id: req.params.id });
  };

  create: RequestHandler = (req, res) => {
    res.json({ created: true });
  };
}
```

#### Route Groups

Organize routes with version and groups:

```typescript
app.registerRoutes({
  version: "v1", // /v1/...
  routes: [new PublicRoute()], // /v1/public
  groups: [
    {
      group: "admin", // /v1/admin/...
      routes: [new AdminRoute()], // /v1/admin/users
    },
    {
      group: "api", // /v1/api/...
      routes: [new ApiRoute()], // /v1/api/data
    },
  ],
});
```

### Request Validation

Use the `@Request` decorator with DTOs for automatic request validation:

```typescript
import {
  Request,
  DataRequestDTO,
  ErrorResp,
} from "@blazjs/common";
import { IsString, IsEmail, IsOptional, Min } from "class-validator";

// Define your DTO
class CreateUserDTO extends DataRequestDTO {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Min(0)
  age?: number;
}

class UsersRoute extends BaseRoute {
  route = "users";

  constructor() {
    super();
    this.router.post("/", this.create.bind(this));
  }

  @Request(CreateUserDTO)
  create(data: CreateUserDTO) {
    // data is validated and typed
    // Pagination is available via data.pagination
    return { user: { name: data.name, email: data.email } };
  }
}
```

The `@Request` decorator:
- Merges `req.params`, `req.query`, and `req.body` into the DTO
- Validates using `class-validator`
- Automatically wraps response in `ResponseWrapper`
- Handles pagination from query params (`?page=1&limit=10`)

### Error Handling

Throw `ErrorResp` for controlled error responses:

```typescript
import { ErrorResp } from "@blazjs/common";

// In your route handler
@Request(GetUserDTO)
getUser(data: GetUserDTO) {
  const user = findUser(data.id);
  if (!user) {
    throw new ErrorResp(
      "user.not_found",    // Error code
      "User not found",     // Message
      404                   // HTTP status (default: 400)
    );
  }
  return user;
}
```

Response format:

```json
{
  "data": null,
  "error": {
    "code": "user.not_found",
    "message": "User not found"
  }
}
```

### Pagination

Built-in pagination support:

```typescript
import { Pagination, DataRequestDTO } from "@blazjs/common";

class ListUsersDTO extends DataRequestDTO {
  // pagination is automatically available from DataRequestDTO
}

@Request(ListUsersDTO)
listUsers(data: ListUsersDTO) {
  const { page, limit } = data.pagination; // from ?page=1&limit=10
  const offset = data.pagination.getOffset();

  const users = getUsers(offset, limit);
  const total = getTotalCount();

  // Set total for response
  data.pagination.total = total;

  return users;
}
```

Response with pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Logging

Use the built-in `DefaultLogger` or create a custom logger:

```typescript
import { DefaultLogger, Logger } from "@blazjs/common";

// Using DefaultLogger (Winston-based)
const logger = new DefaultLogger({
  fileTransport: {
    enabled: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    level: "error", // Only log errors to file
  },
  sanitizeKeys: ["password", "token", "authorization"],
});

logger.info("Server started", { port: 3000 });
logger.debug("Debug info", { data: someData });
logger.warn("Warning message");
logger.error("Error occurred", error);
```

#### Sensitive Data Masking

The logger automatically masks sensitive data:

```typescript
const logger = new DefaultLogger({
  sanitizeKeys: ["password", "apiKey", "token"],
});

logger.info("User login", {
  username: "john",
  password: "secret123", // Will be logged as "<REDACTED>"
});
```

Default sanitized keys include: `password`, `token`, `apiKey`, `authorization`, `cookie`, `cvv`, `privateKey`, `secretKey`, etc.

#### Custom Logger

Extend the `Logger` class to create your own:

```typescript
import { Logger, LoggerOptions, ILogger } from "@blazjs/common";

class CustomLogger extends Logger {
  protected options: LoggerOptions = { sanitizeKeys: [] };

  constructor() {
    super();
    this.logger = createYourLogger(); // Must implement ILogger
  }
}
```

### Health Check

Built-in health check endpoint enabled by default:

```typescript
// Default: GET /health
const app = new App();

// Custom path
const app = new App({
  healthCheck: {
    enabled: true,
    path: "/api/health",
  },
});

// Disable health check
const app = new App({
  healthCheck: { enabled: false },
});
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Request Timeout

Automatic request timeout handling (default: 30 seconds):

```typescript
// Custom timeout (60 seconds)
const app = new App({
  requestTimeout: 60000,
});

// Disable timeout
const app = new App({
  requestTimeout: 0,
});
```

When a request exceeds the timeout, the server responds with:
```json
{
  "error": {
    "code": "error.requestTimeout",
    "message": "Request timeout"
  }
}
```
HTTP Status: `408 Request Timeout`

### Configuration

Use the `Config` class for environment-based configuration:

```typescript
import { Config } from "@blazjs/common";
import { IsString, IsNumber, Min } from "class-validator";

class AppConfig extends Config {
  @IsString()
  DATABASE_URL: string = process.env.DATABASE_URL || "";

  @IsNumber()
  @Min(1)
  PORT: number = Number(process.env.PORT) || 3000;

  @IsString()
  JWT_SECRET: string = process.env.JWT_SECRET || "";
}

// Validate configuration on startup
const config = new AppConfig();
config.validate(); // Throws if validation fails

// Environment helpers
config.isProductionNodeEnv(); // NODE_ENV === "production"
config.isProductionAppEnv();  // APP_ENV === "production"

// Parse JSON from env
const dbConfig = Config.decodeObj(process.env.DB_CONFIG);
```

## API Reference

### Classes

| Class | Description |
|-------|-------------|
| `App` | Main application class wrapping Express |
| `BaseRoute` | Abstract base class for defining routes |
| `Config` | Configuration class with validation support |
| `DefaultLogger` | Winston-based logger with file transport |
| `Logger` | Abstract logger class |
| `DataRequestDTO` | Base DTO with pagination support |
| `Pagination` | Pagination helper class |
| `ResponseWrapper` | Standard response wrapper |
| `ErrorResp` | Error response class |

### Decorators

| Decorator | Description |
|-----------|-------------|
| `@Request(DTOClass?)` | Validates request and wraps response |

### Interfaces

| Interface | Description |
|-----------|-------------|
| `AppOptions` | App configuration options |
| `AppRoute` | Route registration structure |
| `LoggerOptions` | Logger configuration options |
| `ILogger` | Logger interface |

## License

MIT

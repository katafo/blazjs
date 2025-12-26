# @blazjs/auth

JWT authentication module for Blazjs framework.

## Installation

```bash
npm install @blazjs/auth
```

## Features

- Access & Refresh token support
- Token revocation via cache
- Salt mechanism for per-user secrets
- Issuer/Audience validation
- TypeScript support with generics

## Usage

### Basic Setup

```typescript
import { JwtAuth, JwtAuthPayload } from "@blazjs/auth";

interface UserPayload extends JwtAuthPayload {
  sub: string;
  email: string;
  role: string;
}

const jwtAuth = new JwtAuth<UserPayload>({
  secret: "your-access-secret",
  refreshSecret: "your-refresh-secret",
  expiresIn: 3600, // 1 hour
  refreshExpiresIn: 86400 * 7, // 7 days
  issuer: "my-app",
  audience: "my-users",
});
```

### Sign Token

```typescript
const payload = { sub: "user-123", email: "user@example.com", role: "admin" };

// Sign access token
const accessToken = await jwtAuth.sign(payload);

// Sign refresh token
const refreshToken = await jwtAuth.sign(payload, "refresh");

// Sign with salt (per-user secret)
const tokenWithSalt = await jwtAuth.sign(payload, "access", user.passwordHash);
```

### Verify Token

```typescript
try {
  // Verify access token
  const payload = await jwtAuth.verify(token);
  console.log(payload.sub); // "user-123"

  // Verify refresh token
  const refreshPayload = await jwtAuth.verify(refreshToken, "refresh");

  // Verify with salt extraction
  const payload = await jwtAuth.verify(token, "access", async (p) => {
    const user = await getUserById(p.sub);
    return user.passwordHash;
  });
} catch (error) {
  // Token invalid or expired
}
```

### Token Revocation

Requires a cache provider (e.g., Redis):

```typescript
import { RedisService } from "@blazjs/cache";

const redis = new RedisService({ host: "localhost", port: 6379 });
const jwtAuth = new JwtAuth<UserPayload>(config, redis);

// Sign (token is stored in cache)
const token = await jwtAuth.sign(payload);

// Revoke token
await jwtAuth.revoke(token);

// Verify will now fail
await jwtAuth.verify(token); // throws JwtUnauthorizedError
```

## Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `secret` | string | Yes | Secret for signing access tokens |
| `refreshSecret` | string | No | Secret for signing refresh tokens |
| `expiresIn` | number | No | Access token expiration in seconds |
| `refreshExpiresIn` | number | No | Refresh token expiration in seconds |
| `issuer` | string | No | JWT issuer claim |
| `audience` | string | No | JWT audience claim |

## API Reference

### `JwtAuth<T>`

#### Constructor

```typescript
new JwtAuth<T extends JwtAuthPayload>(config: JwtConfig, cache?: CacheProvider)
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `sign` | `payload: T, type?: JwtAuthType, salt?: string` | `Promise<string>` | Sign a JWT token |
| `verify` | `token: string, type?: JwtAuthType, salt?: (payload: T) => Promise<string>` | `Promise<T>` | Verify a JWT token |
| `revoke` | `token: string, type?: JwtAuthType` | `Promise<void>` | Revoke a token (requires cache) |

### `JwtUnauthorizedError`

Error thrown when token verification fails:

```typescript
import { JwtUnauthorizedError } from "@blazjs/auth";

// Properties
JwtUnauthorizedError.code;    // "JwtError.Unauthorized"
JwtUnauthorizedError.message; // "Unauthorized"
JwtUnauthorizedError.status;  // 401
```

## License

MIT

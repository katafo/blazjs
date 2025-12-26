import { CacheProvider } from "@blazjs/cache";
import { ErrorResp } from "@blazjs/common";
import {
  JwtAuth,
  JwtAuthPayload,
  JwtUnauthorizedError,
} from "../lib/jwt/auth";
import { JwtConfig } from "../lib/jwt/config";

// Custom payload interface for testing
interface TestPayload extends JwtAuthPayload {
  sub: string;
  email: string;
  role: string;
}

// Mock CacheProvider
class MockCacheProvider implements CacheProvider {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, _ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async exist(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async mexpire(
    _data: { key: string; ttl: number }[]
  ): Promise<[error: Error | null, result: unknown][] | null> {
    return null;
  }

  clear(): void {
    this.store.clear();
  }

  getStore(): Map<string, string> {
    return this.store;
  }
}

describe("JwtAuth", () => {
  const defaultConfig: JwtConfig = {
    secret: "test-secret-key",
    refreshSecret: "test-refresh-secret-key",
    expiresIn: 3600,
    refreshExpiresIn: 86400,
  };

  const testPayload: TestPayload = {
    sub: "user-123",
    email: "test@example.com",
    role: "admin",
  };

  describe("sign()", () => {
    it("should sign access token successfully", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);

      const token = await jwtAuth.sign(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should sign refresh token successfully", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);

      const token = await jwtAuth.sign(testPayload, "refresh");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should sign token with salt", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const salt = "user-specific-salt";

      const tokenWithSalt = await jwtAuth.sign(testPayload, "access", salt);
      const tokenWithoutSalt = await jwtAuth.sign(testPayload, "access");

      expect(tokenWithSalt).not.toBe(tokenWithoutSalt);
    });

    it("should throw error when access secret is not configured", async () => {
      const configWithoutSecret: JwtConfig = {
        secret: "",
        expiresIn: 3600,
      };
      const jwtAuth = new JwtAuth<TestPayload>(configWithoutSecret);

      await expect(jwtAuth.sign(testPayload, "access")).rejects.toThrow(
        "JWT access secret is not configured"
      );
    });

    it("should throw error when refresh secret is not configured", async () => {
      const configWithoutRefreshSecret: JwtConfig = {
        secret: "test-secret",
        expiresIn: 3600,
      };
      const jwtAuth = new JwtAuth<TestPayload>(configWithoutRefreshSecret);

      await expect(jwtAuth.sign(testPayload, "refresh")).rejects.toThrow(
        "JWT refresh secret is not configured"
      );
    });

    it("should sign token with issuer and audience", async () => {
      const configWithClaims: JwtConfig = {
        ...defaultConfig,
        issuer: "test-issuer",
        audience: "test-audience",
      };
      const jwtAuth = new JwtAuth<TestPayload>(configWithClaims);

      const token = await jwtAuth.sign(testPayload);

      expect(token).toBeDefined();
      // Decode and verify claims are included
      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      expect(payload.iss).toBe("test-issuer");
      expect(payload.aud).toBe("test-audience");
    });

    it("should store token in cache when cache is enabled", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);

      const token = await jwtAuth.sign(testPayload);

      const cacheKey = `access-tokens:${testPayload.sub}:${token}`;
      const cached = await mockCache.exist(cacheKey);
      expect(cached).toBe(1);
    });

    it("should use correct expiration time for access token", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);

      const token = await jwtAuth.sign(testPayload, "access");

      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      expect(payload.exp - payload.iat).toBe(defaultConfig.expiresIn);
    });

    it("should use correct expiration time for refresh token", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);

      const token = await jwtAuth.sign(testPayload, "refresh");

      const parts = token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      expect(payload.exp - payload.iat).toBe(defaultConfig.refreshExpiresIn);
    });
  });

  describe("verify()", () => {
    it("should verify valid access token", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const token = await jwtAuth.sign(testPayload);

      const payload = await jwtAuth.verify(token);

      expect(payload.sub).toBe(testPayload.sub);
      expect(payload.email).toBe(testPayload.email);
      expect(payload.role).toBe(testPayload.role);
    });

    it("should verify valid refresh token", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const token = await jwtAuth.sign(testPayload, "refresh");

      const payload = await jwtAuth.verify(token, "refresh");

      expect(payload.sub).toBe(testPayload.sub);
    });

    it("should verify token with correct salt", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const salt = "user-salt";
      const token = await jwtAuth.sign(testPayload, "access", salt);

      const payload = await jwtAuth.verify(token, "access", async () => salt);

      expect(payload.sub).toBe(testPayload.sub);
    });

    it("should throw error when verifying token with wrong salt", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const token = await jwtAuth.sign(testPayload, "access", "correct-salt");

      await expect(
        jwtAuth.verify(token, "access", async () => "wrong-salt")
      ).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw error for expired token", async () => {
      const shortLivedConfig: JwtConfig = {
        ...defaultConfig,
        expiresIn: 1, // 1 second
      };
      const jwtAuth = new JwtAuth<TestPayload>(shortLivedConfig);
      const token = await jwtAuth.sign(testPayload);

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await expect(jwtAuth.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw error for invalid token", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);

      await expect(jwtAuth.verify("invalid-token")).rejects.toBeInstanceOf(
        ErrorResp
      );
    });

    it("should throw error for token with wrong secret", async () => {
      const jwtAuth1 = new JwtAuth<TestPayload>(defaultConfig);
      const jwtAuth2 = new JwtAuth<TestPayload>({
        ...defaultConfig,
        secret: "different-secret",
      });

      const token = await jwtAuth1.sign(testPayload);

      await expect(jwtAuth2.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw error when issuer does not match", async () => {
      const configWithIssuer: JwtConfig = {
        ...defaultConfig,
        issuer: "issuer-1",
      };
      const jwtAuth1 = new JwtAuth<TestPayload>(configWithIssuer);
      const token = await jwtAuth1.sign(testPayload);

      const jwtAuth2 = new JwtAuth<TestPayload>({
        ...defaultConfig,
        issuer: "issuer-2",
      });

      await expect(jwtAuth2.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw error when audience does not match", async () => {
      const configWithAudience: JwtConfig = {
        ...defaultConfig,
        audience: "audience-1",
      };
      const jwtAuth1 = new JwtAuth<TestPayload>(configWithAudience);
      const token = await jwtAuth1.sign(testPayload);

      const jwtAuth2 = new JwtAuth<TestPayload>({
        ...defaultConfig,
        audience: "audience-2",
      });

      await expect(jwtAuth2.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should verify token exists in cache when cache is enabled", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);
      const token = await jwtAuth.sign(testPayload);

      const payload = await jwtAuth.verify(token);

      expect(payload.sub).toBe(testPayload.sub);
    });

    it("should throw error when token not in cache (revoked)", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);
      const token = await jwtAuth.sign(testPayload);

      // Clear cache to simulate revoked token
      mockCache.clear();

      await expect(jwtAuth.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });

    it("should throw error when refresh secret is not configured", async () => {
      const configWithoutRefreshSecret: JwtConfig = {
        secret: "test-secret",
        expiresIn: 3600,
      };
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const token = await jwtAuth.sign(testPayload, "refresh");

      const jwtAuth2 = new JwtAuth<TestPayload>(configWithoutRefreshSecret);

      await expect(jwtAuth2.verify(token, "refresh")).rejects.toBeInstanceOf(
        ErrorResp
      );
    });
  });

  describe("revoke()", () => {
    it("should revoke token successfully", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);
      const token = await jwtAuth.sign(testPayload);

      await jwtAuth.revoke(token);

      const cacheKey = `access-tokens:${testPayload.sub}:${token}`;
      const cached = await mockCache.exist(cacheKey);
      expect(cached).toBe(0);
    });

    it("should throw error when cache is not enabled", async () => {
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig);
      const token = await jwtAuth.sign(testPayload);

      await expect(jwtAuth.revoke(token)).rejects.toThrow(
        "Jwt cache is not enabled"
      );
    });

    it("should throw error for invalid token", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);

      await expect(jwtAuth.revoke("invalid-token")).rejects.toBeInstanceOf(
        ErrorResp
      );
    });

    it("should revoke refresh token", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);
      const token = await jwtAuth.sign(testPayload, "refresh");

      await jwtAuth.revoke(token, "refresh");

      const cacheKey = `refresh-tokens:${testPayload.sub}:${token}`;
      const cached = await mockCache.exist(cacheKey);
      expect(cached).toBe(0);
    });
  });

  describe("Integration: Sign → Verify → Revoke → Verify fails", () => {
    it("should complete full token lifecycle", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);

      // Sign
      const token = await jwtAuth.sign(testPayload);
      expect(token).toBeDefined();

      // Verify
      const payload = await jwtAuth.verify(token);
      expect(payload.sub).toBe(testPayload.sub);

      // Revoke
      await jwtAuth.revoke(token);

      // Verify should fail after revoke
      await expect(jwtAuth.verify(token)).rejects.toBeInstanceOf(ErrorResp);
    });
  });

  describe("Integration: Access + Refresh token flow", () => {
    it("should handle both token types correctly", async () => {
      const mockCache = new MockCacheProvider();
      const jwtAuth = new JwtAuth<TestPayload>(defaultConfig, mockCache);

      // Sign both tokens
      const accessToken = await jwtAuth.sign(testPayload, "access");
      const refreshToken = await jwtAuth.sign(testPayload, "refresh");

      // Tokens should be different
      expect(accessToken).not.toBe(refreshToken);

      // Verify access token with access type
      const accessPayload = await jwtAuth.verify(accessToken, "access");
      expect(accessPayload.sub).toBe(testPayload.sub);

      // Verify refresh token with refresh type
      const refreshPayload = await jwtAuth.verify(refreshToken, "refresh");
      expect(refreshPayload.sub).toBe(testPayload.sub);

      // Verify access token with refresh type should fail (wrong secret)
      await expect(
        jwtAuth.verify(accessToken, "refresh")
      ).rejects.toBeInstanceOf(ErrorResp);

      // Verify refresh token with access type should fail (wrong secret)
      await expect(
        jwtAuth.verify(refreshToken, "access")
      ).rejects.toBeInstanceOf(ErrorResp);
    });
  });

  describe("JwtUnauthorizedError", () => {
    it("should be an instance of ErrorResp", () => {
      expect(JwtUnauthorizedError).toBeInstanceOf(ErrorResp);
    });

    it("should have correct properties", () => {
      expect(JwtUnauthorizedError.code).toBe("JwtError.Unauthorized");
      expect(JwtUnauthorizedError.message).toBe("Unauthorized");
      expect(JwtUnauthorizedError.status).toBe(401);
    });
  });
});

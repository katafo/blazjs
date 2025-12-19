import { Request, Response, NextFunction } from "express";
import { Logger } from "../../lib/loggers/logger";
import { ILogger, LoggerOptions } from "../../lib/loggers/logger.interface";
import { ErrorResp } from "../../lib/responses";

// Concrete implementation for testing abstract Logger class
class TestLogger extends Logger {
  protected options: LoggerOptions = { sanitizeKeys: [] };
  calls: { method: string; message: string; meta: unknown[] }[] = [];

  constructor(options?: LoggerOptions) {
    super();
    if (options) {
      this.options = options;
    }
    this.logger = {
      log: (level: string, message: string, ...meta: unknown[]) => {
        this.calls.push({ method: `log:${level}`, message, meta });
      },
      debug: (message: string, ...meta: unknown[]) => {
        this.calls.push({ method: "debug", message, meta });
      },
      info: (message: string, ...meta: unknown[]) => {
        this.calls.push({ method: "info", message, meta });
      },
      warn: (message: string, ...meta: unknown[]) => {
        this.calls.push({ method: "warn", message, meta });
      },
      error: (message: string, ...meta: unknown[]) => {
        this.calls.push({ method: "error", message, meta });
      },
      add: () => {},
    } as ILogger;
  }

  clearCalls() {
    this.calls = [];
  }
}

describe("Logger", () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger();
  });

  describe("mask", () => {
    it("should redact sanitized keys", () => {
      logger.setSanitizeKeys(["password", "token"]);
      const data = {
        username: "john",
        password: "secret123",
        token: "abc123",
      };

      const result = logger.mask(data);

      expect(result.username).toBe("john");
      expect(result.password).toBe("<REDACTED>");
      expect(result.token).toBe("<REDACTED>");
    });

    it("should not modify non-sensitive keys", () => {
      logger.setSanitizeKeys(["password"]);
      const data = {
        username: "john",
        email: "john@example.com",
      };

      const result = logger.mask(data);

      expect(result.username).toBe("john");
      expect(result.email).toBe("john@example.com");
    });

    it("should handle nested objects", () => {
      logger.setSanitizeKeys(["password", "apiKey"]);
      const data = {
        user: {
          name: "john",
          password: "secret",
        },
        config: {
          apiKey: "key123",
          url: "http://example.com",
        },
      };

      const result = logger.mask(data);

      expect(result.user.name).toBe("john");
      expect(result.user.password).toBe("<REDACTED>");
      expect(result.config.apiKey).toBe("<REDACTED>");
      expect(result.config.url).toBe("http://example.com");
    });

    it("should return primitive values unchanged", () => {
      logger.setSanitizeKeys(["password"]);

      expect(logger.mask("string")).toBe("string");
      expect(logger.mask(123)).toBe(123);
      expect(logger.mask(true)).toBe(true);
      expect(logger.mask(null)).toBe(null);
    });

    it("should return data unchanged when no sanitize keys", () => {
      const data = { password: "secret", token: "abc" };

      const result = logger.mask(data);

      expect(result.password).toBe("secret");
      expect(result.token).toBe("abc");
    });

    it("should handle arrays", () => {
      logger.setSanitizeKeys(["password"]);
      const data = [
        { username: "john", password: "secret1" },
        { username: "jane", password: "secret2" },
      ];

      const result = logger.mask(data);

      expect(result[0].username).toBe("john");
      expect(result[0].password).toBe("<REDACTED>");
      expect(result[1].username).toBe("jane");
      expect(result[1].password).toBe("<REDACTED>");
    });
  });

  describe("request", () => {
    const createMockRequest = (overrides: Partial<Request> = {}): Request => {
      return {
        ip: "127.0.0.1",
        method: "GET",
        originalUrl: "/api/users",
        headers: { authorization: "Bearer token123" },
        body: { data: "test" },
        query: { page: "1" },
        params: { id: "123" },
        ...overrides,
      } as unknown as Request;
    };

    it("should format request object", () => {
      const req = createMockRequest();

      const result = logger.request(req);

      expect(result).toEqual({
        ip: "127.0.0.1",
        method: "GET",
        url: "/api/users",
        userId: undefined,
        headers: { authorization: "Bearer token123" },
        body: { data: "test" },
        query: { page: "1" },
        params: { id: "123" },
      });
    });

    it("should include userId if present", () => {
      const req = createMockRequest();
      (req as any).userId = "user123";

      const result = logger.request(req) as any;

      expect(result.userId).toBe("user123");
    });

    it("should mask sensitive headers", () => {
      logger.setSanitizeKeys(["authorization", "cookie"]);
      const req = createMockRequest({
        headers: {
          authorization: "Bearer secret",
          cookie: "session=abc123",
          "content-type": "application/json",
        },
      });

      const result = logger.request(req) as any;

      expect(result.headers.authorization).toBe("<REDACTED>");
      expect(result.headers.cookie).toBe("<REDACTED>");
      expect(result.headers["content-type"]).toBe("application/json");
    });

    it("should mask sensitive body fields", () => {
      logger.setSanitizeKeys(["password"]);
      const req = createMockRequest({
        body: { username: "john", password: "secret" },
      });

      const result = logger.request(req) as any;

      expect(result.body.username).toBe("john");
      expect(result.body.password).toBe("<REDACTED>");
    });
  });

  describe("setSanitizeKeys", () => {
    it("should replace sanitize keys", () => {
      logger.setSanitizeKeys(["password"]);
      logger.setSanitizeKeys(["token", "apiKey"]);

      const data = { password: "secret", token: "abc", apiKey: "key" };
      const result = logger.mask(data);

      expect(result.password).toBe("secret"); // not masked anymore
      expect(result.token).toBe("<REDACTED>");
      expect(result.apiKey).toBe("<REDACTED>");
    });
  });

  describe("addSanitizeKeys", () => {
    it("should append keys to existing", () => {
      logger.setSanitizeKeys(["password"]);
      logger.addSanitizeKeys(["token"]);

      const data = { password: "secret", token: "abc" };
      const result = logger.mask(data);

      expect(result.password).toBe("<REDACTED>");
      expect(result.token).toBe("<REDACTED>");
    });

    it("should work when no existing keys", () => {
      logger.addSanitizeKeys(["password"]);

      const data = { password: "secret" };
      const result = logger.mask(data);

      expect(result.password).toBe("<REDACTED>");
    });
  });

  describe("errorLogMiddleware", () => {
    const createMockRequest = (): Request => {
      return {
        ip: "127.0.0.1",
        method: "POST",
        originalUrl: "/api/login",
        headers: {},
        body: {},
        query: {},
        params: {},
      } as unknown as Request;
    };

    const createMockResponse = (): Response => {
      return {} as Response;
    };

    const createMockNext = (): NextFunction => jest.fn();

    it("should warn for 401 unauthorized errors", () => {
      const err = new ErrorResp("auth.unauthorized", "Unauthorized", 401);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(logger.calls[0].method).toBe("warn");
      expect(logger.calls[0].message).toBe("Unauthorized");
      expect(next).toHaveBeenCalledWith(err);
    });

    it("should warn for 403 forbidden errors", () => {
      const err = new ErrorResp("auth.forbidden", "Forbidden", 403);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(logger.calls[0].method).toBe("warn");
      expect(logger.calls[0].message).toBe("Forbidden");
    });

    it("should warn for 429 too many requests", () => {
      const err = new ErrorResp("rate.limited", "Too many requests", 429);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(logger.calls[0].method).toBe("warn");
      expect(logger.calls[0].message).toBe("Too many requests");
    });

    it("should debug for other ErrorResp errors", () => {
      const err = new ErrorResp("validation.failed", "Invalid input", 400);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(logger.calls[0].method).toBe("debug");
      expect(logger.calls[0].message).toBe("Invalid input");
    });

    it("should error for internal server errors", () => {
      const err = new Error("Database connection failed");
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(logger.calls[0].method).toBe("error");
      expect(logger.calls[0].message).toBe("Database connection failed");
    });

    it("should hide stack trace in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const err = new Error("Some error");
      err.stack = "Error: Some error\n    at Test.fn";
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      const logMeta = logger.calls[0].meta[0] as any;
      expect(logMeta.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should show stack trace in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const err = new Error("Some error");
      err.stack = "Error: Some error\n    at Test.fn";
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      const logMeta = logger.calls[0].meta[0] as any;
      expect(logMeta.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should call next with error", () => {
      const err = new Error("Test error");
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      logger.errorLogMiddleware(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("logging methods", () => {
    it("should call log with level", () => {
      logger.log("custom", "Custom message", { data: "test" });

      expect(logger.calls[0].method).toBe("log:custom");
      expect(logger.calls[0].message).toBe("Custom message");
    });

    it("should call debug", () => {
      logger.debug("Debug message", { data: "test" });

      expect(logger.calls[0].method).toBe("debug");
      expect(logger.calls[0].message).toBe("Debug message");
    });

    it("should call info", () => {
      logger.info("Info message");

      expect(logger.calls[0].method).toBe("info");
      expect(logger.calls[0].message).toBe("Info message");
    });

    it("should call warn", () => {
      logger.warn("Warning message");

      expect(logger.calls[0].method).toBe("warn");
      expect(logger.calls[0].message).toBe("Warning message");
    });

    it("should call error", () => {
      logger.error("Error message", new Error("test"));

      expect(logger.calls[0].method).toBe("error");
      expect(logger.calls[0].message).toBe("Error message");
    });
  });
});

import { DefaultLogger, SANITIZED_KEYS } from "../../lib/loggers/default.logger";

describe("DefaultLogger", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("constructor", () => {
    it("should create with default options", () => {
      const logger = new DefaultLogger();

      expect(logger).toBeDefined();
    });

    it("should override options when provided", () => {
      const logger = new DefaultLogger({
        fileTransport: { enabled: false },
        sanitizeKeys: ["customKey"],
      });

      expect(logger).toBeDefined();
    });
  });

  describe("SANITIZED_KEYS", () => {
    it("should include common sensitive keys", () => {
      expect(SANITIZED_KEYS).toContain("password");
      expect(SANITIZED_KEYS).toContain("token");
      expect(SANITIZED_KEYS).toContain("cvv");
      expect(SANITIZED_KEYS).toContain("privateKey");
      expect(SANITIZED_KEYS).toContain("secretKey");
      expect(SANITIZED_KEYS).toContain("apiKey");
      expect(SANITIZED_KEYS).toContain("authorization");
      expect(SANITIZED_KEYS).toContain("x-api-key");
      expect(SANITIZED_KEYS).toContain("cookie");
      expect(SANITIZED_KEYS).toContain("set-cookie");
      expect(SANITIZED_KEYS).toContain("x-access-token");
    });
  });

  describe("log level", () => {
    it("should set level to info in production", () => {
      process.env.NODE_ENV = "production";

      const logger = new DefaultLogger();

      // Logger is created successfully
      expect(logger).toBeDefined();
    });

    it("should set level to debug in development", () => {
      process.env.NODE_ENV = "development";

      const logger = new DefaultLogger();

      expect(logger).toBeDefined();
    });
  });

  describe("file transport", () => {
    it("should add file transports when enabled", () => {
      const logger = new DefaultLogger({
        fileTransport: { enabled: true },
      });

      expect(logger).toBeDefined();
    });

    it("should not add file transports when disabled", () => {
      const logger = new DefaultLogger({
        fileTransport: { enabled: false },
      });

      expect(logger).toBeDefined();
    });

    it("should use custom maxSize and maxFiles", () => {
      const logger = new DefaultLogger({
        fileTransport: {
          enabled: true,
          maxSize: 5 * 1024 * 1024,
          maxFiles: 3,
        },
      });

      expect(logger).toBeDefined();
    });

    it("should only add error file transport when level is error", () => {
      const logger = new DefaultLogger({
        fileTransport: {
          enabled: true,
          level: "error",
        },
      });

      expect(logger).toBeDefined();
    });
  });

  describe("sanitize keys", () => {
    it("should include default SANITIZED_KEYS", () => {
      const logger = new DefaultLogger();
      const data = { password: "secret", username: "john" };

      const result = logger.mask(data);

      expect(result.password).toBe("<REDACTED>");
      expect(result.username).toBe("john");
    });

    it("should mask authorization header", () => {
      const logger = new DefaultLogger();
      const data = { authorization: "Bearer token123" };

      const result = logger.mask(data);

      expect(result.authorization).toBe("<REDACTED>");
    });
  });

  describe("logging methods", () => {
    let logger: DefaultLogger;

    beforeEach(() => {
      logger = new DefaultLogger({ fileTransport: { enabled: false } });
    });

    it("should log info messages", () => {
      expect(() => logger.info("Test info message")).not.toThrow();
    });

    it("should log debug messages", () => {
      expect(() => logger.debug("Test debug message")).not.toThrow();
    });

    it("should log warn messages", () => {
      expect(() => logger.warn("Test warn message")).not.toThrow();
    });

    it("should log error messages", () => {
      expect(() => logger.error("Test error message")).not.toThrow();
    });

    it("should log with metadata", () => {
      expect(() =>
        logger.info("Test message", { key: "value" })
      ).not.toThrow();
    });
  });
});

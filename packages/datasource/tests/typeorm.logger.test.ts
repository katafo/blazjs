import { Logger } from "@blazjs/common";
import { TypeOrmLogger } from "../lib/typeorm.logger";

// Create a mock Logger class that extends Logger
class MockLogger extends Logger {
  protected logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    add: jest.fn(),
  };
  protected options = {};

  // Expose internal logger for assertions
  getMockLogger() {
    return this.logger;
  }
}

describe("TypeOrmLogger", () => {
  let mockLogger: MockLogger;
  let typeOrmLogger: TypeOrmLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    typeOrmLogger = new TypeOrmLogger(mockLogger);
  });

  describe("constructor", () => {
    it("should use provided logger", () => {
      const logger = new TypeOrmLogger(mockLogger);
      logger.logQuery("SELECT 1");

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalled();
    });

    it("should use DefaultLogger when no logger provided", () => {
      const logger = new TypeOrmLogger();

      // Should not throw
      expect(() => logger.logQuery("SELECT 1")).not.toThrow();
    });
  });

  describe("logQuery()", () => {
    it("should log query at debug level", () => {
      typeOrmLogger.logQuery("SELECT * FROM users");

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] SELECT * FROM users"
      );
    });

    it("should interpolate parameters into query", () => {
      typeOrmLogger.logQuery("SELECT * FROM users WHERE id = ?", [1]);

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] SELECT * FROM users WHERE id = 1"
      );
    });

    it("should handle multiple parameters", () => {
      typeOrmLogger.logQuery(
        "SELECT * FROM users WHERE id = ? AND name = ?",
        [1, "John"]
      );

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        '[QUERY] SELECT * FROM users WHERE id = 1 AND name = "John"'
      );
    });

    it("should normalize whitespace in query", () => {
      typeOrmLogger.logQuery("SELECT *\n  FROM users\n  WHERE id = 1");

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] SELECT * FROM users WHERE id = 1"
      );
    });
  });

  describe("logQuerySlow()", () => {
    it("should log slow query at warn level", () => {
      typeOrmLogger.logQuerySlow(500, "SELECT * FROM users");

      expect(mockLogger.getMockLogger().warn).toHaveBeenCalledWith(
        "[QUERY] [500ms] - SELECT * FROM users"
      );
    });

    it("should include execution time in message", () => {
      typeOrmLogger.logQuerySlow(1234, "SELECT 1");

      expect(mockLogger.getMockLogger().warn).toHaveBeenCalledWith(
        "[QUERY] [1234ms] - SELECT 1"
      );
    });

    it("should interpolate parameters", () => {
      typeOrmLogger.logQuerySlow(100, "SELECT * FROM users WHERE id = ?", [42]);

      expect(mockLogger.getMockLogger().warn).toHaveBeenCalledWith(
        "[QUERY] [100ms] - SELECT * FROM users WHERE id = 42"
      );
    });
  });

  describe("logQueryError()", () => {
    it("should log error at error level", () => {
      typeOrmLogger.logQueryError("Connection failed", "SELECT 1");

      expect(mockLogger.getMockLogger().error).toHaveBeenCalledWith(
        "[QUERY ERROR] Connection failed - SELECT 1"
      );
    });

    it("should handle Error object", () => {
      const error = new Error("Database error");
      typeOrmLogger.logQueryError(error, "SELECT * FROM users");

      expect(mockLogger.getMockLogger().error).toHaveBeenCalledWith(
        "[QUERY ERROR] Database error - SELECT * FROM users"
      );
    });

    it("should handle string error", () => {
      typeOrmLogger.logQueryError("Timeout", "SELECT * FROM users");

      expect(mockLogger.getMockLogger().error).toHaveBeenCalledWith(
        "[QUERY ERROR] Timeout - SELECT * FROM users"
      );
    });

    it("should interpolate parameters", () => {
      typeOrmLogger.logQueryError(
        "Constraint violation",
        "INSERT INTO users (id) VALUES (?)",
        [1]
      );

      expect(mockLogger.getMockLogger().error).toHaveBeenCalledWith(
        "[QUERY ERROR] Constraint violation - INSERT INTO users (id) VALUES (1)"
      );
    });
  });

  describe("generateQuery()", () => {
    it("should return query without params unchanged (except whitespace)", () => {
      typeOrmLogger.logQuery("SELECT * FROM users");

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] SELECT * FROM users"
      );
    });

    it("should handle null parameters", () => {
      typeOrmLogger.logQuery("INSERT INTO users (name) VALUES (?)", [null]);

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] INSERT INTO users (name) VALUES (null)"
      );
    });

    it("should handle boolean parameters", () => {
      typeOrmLogger.logQuery("UPDATE users SET active = ?", [true]);

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        "[QUERY] UPDATE users SET active = true"
      );
    });

    it("should handle object parameters", () => {
      typeOrmLogger.logQuery("INSERT INTO data (json) VALUES (?)", [
        { key: "value" },
      ]);

      expect(mockLogger.getMockLogger().debug).toHaveBeenCalledWith(
        '[QUERY] INSERT INTO data (json) VALUES ({"key":"value"})'
      );
    });
  });

  describe("writeLog()", () => {
    it("should be defined but empty (required by AbstractLogger)", () => {
      // writeLog is protected but we can verify it doesn't throw
      expect(() => {
        // Access protected method for testing
        (typeOrmLogger as any).writeLog("log", "test message");
      }).not.toThrow();
    });
  });
});

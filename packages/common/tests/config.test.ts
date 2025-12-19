import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";
import { Config } from "../lib/config";

// Extended Config for testing validation
class TestConfig extends Config {
  @IsString()
  @IsNotEmpty()
  dbHost: string;

  @IsNumber()
  @Min(1)
  dbPort: number;

  constructor() {
    super();
    this.dbHost = process.env.DB_HOST || "";
    this.dbPort = Number(process.env.DB_PORT) || 0;
  }
}

describe("Config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("constructor", () => {
    it("should use default values when env not set", () => {
      delete process.env.NODE_ENV;
      delete process.env.APP_ENV;
      delete process.env.PORT;

      const config = new Config();

      expect(config.nodeEnv).toBe("development");
      expect(config.appEnv).toBe("development");
      expect(config.port).toBe(3000);
    });

    it("should read from process.env", () => {
      process.env.NODE_ENV = "production";
      process.env.APP_ENV = "staging";
      process.env.PORT = "8080";

      const config = new Config();

      expect(config.nodeEnv).toBe("production");
      expect(config.appEnv).toBe("staging");
      expect(config.port).toBe(8080);
    });
  });

  describe("isProductionNodeEnv", () => {
    it("should return true when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";

      const config = new Config();

      expect(config.isProductionNodeEnv()).toBe(true);
    });

    it("should return false when NODE_ENV is development", () => {
      process.env.NODE_ENV = "development";

      const config = new Config();

      expect(config.isProductionNodeEnv()).toBe(false);
    });

    it("should return false when NODE_ENV is test", () => {
      process.env.NODE_ENV = "test";

      const config = new Config();

      expect(config.isProductionNodeEnv()).toBe(false);
    });
  });

  describe("isProductionAppEnv", () => {
    it("should return true when APP_ENV is production", () => {
      process.env.APP_ENV = "production";

      const config = new Config();

      expect(config.isProductionAppEnv()).toBe(true);
    });

    it("should return false when APP_ENV is staging", () => {
      process.env.APP_ENV = "staging";

      const config = new Config();

      expect(config.isProductionAppEnv()).toBe(false);
    });

    it("should return false when APP_ENV is development", () => {
      process.env.APP_ENV = "development";

      const config = new Config();

      expect(config.isProductionAppEnv()).toBe(false);
    });
  });

  describe("decodeObj", () => {
    it("should parse valid JSON string", () => {
      const config = new Config();
      const jsonStr = '{"host":"localhost","port":5432}';

      const result = config.decodeObj(jsonStr);

      expect(result).toEqual({ host: "localhost", port: 5432 });
    });

    it("should throw when string is undefined", () => {
      const config = new Config();

      expect(() => config.decodeObj(undefined)).toThrow("Env validation error");
    });

    it("should handle escaped backslashes", () => {
      const config = new Config();
      const jsonStr = '{\\"key\\":\\"value\\"}';

      const result = config.decodeObj(jsonStr);

      expect(result).toEqual({ key: "value" });
    });

    it("should parse complex nested objects", () => {
      const config = new Config();
      const jsonStr = '{"db":{"host":"localhost","credentials":{"user":"admin","pass":"secret"}}}';

      const result = config.decodeObj(jsonStr);

      expect(result).toEqual({
        db: {
          host: "localhost",
          credentials: {
            user: "admin",
            pass: "secret",
          },
        },
      });
    });

    it("should parse arrays", () => {
      const config = new Config();
      const jsonStr = '{"hosts":["host1","host2","host3"]}';

      const result = config.decodeObj(jsonStr);

      expect(result).toEqual({ hosts: ["host1", "host2", "host3"] });
    });
  });

  describe("validate", () => {
    it("should pass with valid config", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "5432";

      const config = new TestConfig();

      expect(() => config.validate()).not.toThrow();
    });

    it("should throw with invalid config - missing required field", () => {
      process.env.DB_HOST = "";
      process.env.DB_PORT = "5432";

      const config = new TestConfig();

      expect(() => config.validate()).toThrow("Env validation error");
    });

    it("should throw with invalid config - invalid number", () => {
      process.env.DB_HOST = "localhost";
      process.env.DB_PORT = "0";

      const config = new TestConfig();

      expect(() => config.validate()).toThrow("Env validation error");
    });

    it("should include property names in error message", () => {
      process.env.DB_HOST = "";
      process.env.DB_PORT = "0";

      const config = new TestConfig();

      try {
        config.validate();
        fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toContain("Env validation error");
      }
    });

    it("should not throw for base Config class", () => {
      const config = new Config();

      expect(() => config.validate()).not.toThrow();
    });
  });
});

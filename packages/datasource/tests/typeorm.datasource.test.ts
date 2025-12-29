import { Logger } from "@blazjs/common";
import { DataSource, EntityManager, QueryRunner } from "typeorm";
import { TypeOrmDataSource } from "../lib/typeorm.datasource";

// Mock typeorm - preserve actual AbstractLogger
jest.mock("typeorm", () => {
  const mockQueryRunner = {
    manager: {
      transaction: jest.fn((handler) => handler(mockQueryRunner.manager)),
    },
    release: jest.fn().mockResolvedValue(undefined),
  };

  const mockDataSource = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{ 1: 1 }]),
    runMigrations: jest.fn().mockResolvedValue([]),
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    manager: { find: jest.fn() },
    isInitialized: true,
    logger: null,
  };

  const actual = jest.requireActual("typeorm");

  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => mockDataSource),
  };
});

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

  getMockLogger() {
    return this.logger;
  }
}

const mockLogger = new MockLogger();

describe("TypeOrmDataSource", () => {
  let datasource: TypeOrmDataSource;
  let mockDataSourceInstance: jest.Mocked<DataSource>;

  beforeEach(() => {
    jest.clearAllMocks();
    datasource = new TypeOrmDataSource(
      { type: "sqlite", database: ":memory:" },
      mockLogger
    );
    mockDataSourceInstance = datasource.source as jest.Mocked<DataSource>;
  });

  describe("constructor", () => {
    it("should create DataSource with options", () => {
      expect(DataSource).toHaveBeenCalledWith({
        type: "sqlite",
        database: ":memory:",
      });
    });

    it("should set TypeOrmLogger on source", () => {
      expect(datasource.source.logger).toBeDefined();
    });
  });

  describe("initialize()", () => {
    it("should call source.initialize", async () => {
      await datasource.initialize();

      expect(mockDataSourceInstance.initialize).toHaveBeenCalled();
    });
  });

  describe("transaction()", () => {
    it("should create queryRunner with master mode", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      await datasource.transaction(handler);

      expect(mockDataSourceInstance.createQueryRunner).toHaveBeenCalledWith(
        "master"
      );
    });

    it("should execute handler within transaction", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      const result = await datasource.transaction(handler);

      expect(handler).toHaveBeenCalled();
      expect(result).toBe("result");
    });

    it("should release queryRunner after success", async () => {
      const handler = jest.fn().mockResolvedValue("result");
      const mockQueryRunner =
        mockDataSourceInstance.createQueryRunner() as jest.Mocked<QueryRunner>;

      await datasource.transaction(handler);

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should release queryRunner on error", async () => {
      const error = new Error("Transaction failed");
      const handler = jest.fn().mockRejectedValue(error);
      const mockQueryRunner =
        mockDataSourceInstance.createQueryRunner() as jest.Mocked<QueryRunner>;

      // Reset mock to throw error in transaction
      (mockQueryRunner.manager.transaction as jest.Mock).mockRejectedValueOnce(
        error
      );

      await expect(datasource.transaction(handler)).rejects.toThrow(
        "Transaction failed"
      );
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe("query()", () => {
    it("should use slave mode when mode is undefined", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      await datasource.query(undefined, handler);

      expect(mockDataSourceInstance.createQueryRunner).toHaveBeenCalledWith(
        "slave"
      );
    });

    it("should use slave mode when mode is 'slave'", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      await datasource.query("slave", handler);

      expect(mockDataSourceInstance.createQueryRunner).toHaveBeenCalledWith(
        "slave"
      );
    });

    it("should use master mode when mode is 'master'", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      await datasource.query("master", handler);

      expect(mockDataSourceInstance.createQueryRunner).toHaveBeenCalledWith(
        "master"
      );
    });

    it("should use EntityManager directly when provided", async () => {
      const mockEntityManager = { find: jest.fn() } as unknown as EntityManager;
      const handler = jest.fn().mockResolvedValue("result");

      // Make instanceof check work
      Object.setPrototypeOf(mockEntityManager, EntityManager.prototype);

      await datasource.query(mockEntityManager, handler);

      expect(handler).toHaveBeenCalledWith(mockEntityManager);
      expect(mockDataSourceInstance.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should release queryRunner after query", async () => {
      const handler = jest.fn().mockResolvedValue("result");
      const mockQueryRunner =
        mockDataSourceInstance.createQueryRunner() as jest.Mocked<QueryRunner>;

      await datasource.query("master", handler);

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe("runMigration()", () => {
    it("should call source.runMigrations with options", async () => {
      const options = { transaction: "all" as const, fake: false };

      await datasource.runMigration(options);

      expect(mockDataSourceInstance.runMigrations).toHaveBeenCalledWith(
        options
      );
    });

    it("should call source.runMigrations without options", async () => {
      await datasource.runMigration();

      expect(mockDataSourceInstance.runMigrations).toHaveBeenCalledWith(
        undefined
      );
    });
  });

  describe("close()", () => {
    it("should call source.destroy", async () => {
      await datasource.close();

      expect(mockDataSourceInstance.destroy).toHaveBeenCalled();
    });
  });

  describe("isConnected()", () => {
    it("should return true when connected", async () => {
      const result = await datasource.isConnected();

      expect(result).toBe(true);
      expect(mockDataSourceInstance.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("should return false when not initialized", async () => {
      Object.defineProperty(mockDataSourceInstance, "isInitialized", {
        value: false,
        writable: true,
      });

      const result = await datasource.isConnected();

      expect(result).toBe(false);
    });

    it("should return false when query fails", async () => {
      mockDataSourceInstance.query.mockRejectedValueOnce(
        new Error("Connection lost")
      );

      const result = await datasource.isConnected();

      expect(result).toBe(false);
    });
  });

  describe("reconnect()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return interval ID", () => {
      const intervalId = datasource.reconnect(5000);

      expect(intervalId).toBeDefined();
      clearInterval(intervalId);
    });

    it("should not reconnect when already connected", async () => {
      const intervalId = datasource.reconnect(1000);

      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // flush promises

      expect(mockDataSourceInstance.destroy).not.toHaveBeenCalled();
      clearInterval(intervalId);
    });

    it("should attempt reconnect when disconnected", async () => {
      // Make isConnected return false
      mockDataSourceInstance.query.mockRejectedValue(
        new Error("Connection lost")
      );
      Object.defineProperty(mockDataSourceInstance, "isInitialized", {
        value: true,
        writable: true,
      });

      const intervalId = datasource.reconnect(1000);

      // Advance timers and flush all promises
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // The reconnect logic should have been triggered
      expect(mockDataSourceInstance.destroy).toHaveBeenCalled();
      clearInterval(intervalId);
    });
  });
});

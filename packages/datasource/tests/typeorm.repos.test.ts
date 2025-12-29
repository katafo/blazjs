import { Repository } from "typeorm";
import { TypeOrmDataSource } from "../lib/typeorm.datasource";
import { TypeOrmRepos } from "../lib/typeorm.repos";

// Mock entity for testing
class TestEntity {
  id!: number;
  name!: string;
}

// Mock TypeOrmDataSource
jest.mock("../lib/typeorm.datasource", () => {
  return {
    TypeOrmDataSource: jest.fn().mockImplementation(() => ({
      source: {
        getRepository: jest.fn().mockReturnValue({
          target: TestEntity,
          manager: { find: jest.fn() },
        }),
      },
      transaction: jest.fn().mockImplementation((handler) => handler({})),
    })),
  };
});

describe("TypeOrmRepos", () => {
  let mockDatasource: jest.Mocked<TypeOrmDataSource>;
  let repos: TypeOrmRepos<TestEntity>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDatasource = new TypeOrmDataSource({
      type: "sqlite",
      database: ":memory:",
    }) as jest.Mocked<TypeOrmDataSource>;
    repos = new TypeOrmRepos(TestEntity, mockDatasource);
  });

  describe("constructor", () => {
    it("should extend Repository", () => {
      expect(repos).toBeInstanceOf(Repository);
    });

    it("should store datasource reference", () => {
      expect((repos as any).datasource).toBe(mockDatasource);
    });

    it("should get repository from datasource", () => {
      expect(mockDatasource.source.getRepository).toHaveBeenCalledWith(
        TestEntity
      );
    });
  });

  describe("transaction()", () => {
    it("should delegate to datasource.transaction", async () => {
      const handler = jest.fn().mockResolvedValue("result");

      await repos.transaction(handler);

      expect(mockDatasource.transaction).toHaveBeenCalledWith(handler);
    });

    it("should return result from handler", async () => {
      const handler = jest.fn().mockResolvedValue({ id: 1, name: "Test" });
      mockDatasource.transaction.mockResolvedValueOnce({ id: 1, name: "Test" });

      const result = await repos.transaction(handler);

      expect(result).toEqual({ id: 1, name: "Test" });
    });

    it("should propagate errors from transaction", async () => {
      const error = new Error("Transaction failed");
      mockDatasource.transaction.mockRejectedValueOnce(error);

      await expect(repos.transaction(jest.fn())).rejects.toThrow(
        "Transaction failed"
      );
    });
  });
});

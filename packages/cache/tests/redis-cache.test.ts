import { RedisCacheService } from "../lib/redis.service";

// Mock ioredis
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
  // Hash
  hget: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  hexists: jest.fn(),
  hdel: jest.fn(),
  // Set
  sadd: jest.fn(),
  sismember: jest.fn(),
  srem: jest.fn(),
  // Sorted Set
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrank: jest.fn(),
  zrevrank: jest.fn(),
  zscore: jest.fn(),
  zcard: jest.fn(),
  zcount: jest.fn(),
  zrange: jest.fn(),
  zremrangebyrank: jest.fn(),
  zscan: jest.fn(),
  // List
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  llen: jest.fn(),
  ltrim: jest.fn(),
  // JSON (via call)
  call: jest.fn(),
  // Pipeline
  pipeline: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

// Reset pipeline to return proper chainable object
mockRedisClient.pipeline.mockReturnValue({
  set: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zrem: jest.fn().mockReturnThis(),
  sismember: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
});

describe("RedisCacheService", () => {
  let cache: RedisCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new RedisCacheService({ host: "localhost", port: 6379 });
  });

  describe("Basic Cache Operations", () => {
    describe("get()", () => {
      it("should return value when key exists", async () => {
        mockRedisClient.get.mockResolvedValue("test-value");

        const result = await cache.get("test-key");

        expect(result).toBe("test-value");
        expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
      });

      it("should return null when key does not exist", async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await cache.get("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("set()", () => {
      it("should set value without TTL", async () => {
        const pipeline = mockRedisClient.pipeline();

        await cache.set("key", "value");

        expect(pipeline.set).toHaveBeenCalledWith("key", "value");
        expect(pipeline.exec).toHaveBeenCalled();
      });

      it("should set value with TTL", async () => {
        const pipeline = mockRedisClient.pipeline();

        await cache.set("key", "value", 3600);

        expect(pipeline.set).toHaveBeenCalledWith("key", "value");
        expect(pipeline.expire).toHaveBeenCalledWith("key", 3600);
        expect(pipeline.exec).toHaveBeenCalled();
      });
    });

    describe("del()", () => {
      it("should delete key and return 1", async () => {
        mockRedisClient.del.mockResolvedValue(1);

        const result = await cache.del("key");

        expect(result).toBe(1);
        expect(mockRedisClient.del).toHaveBeenCalledWith("key");
      });

      it("should return 0 when key does not exist", async () => {
        mockRedisClient.del.mockResolvedValue(0);

        const result = await cache.del("non-existent");

        expect(result).toBe(0);
      });
    });

    describe("exist()", () => {
      it("should return 1 when key exists", async () => {
        mockRedisClient.exists.mockResolvedValue(1);

        const result = await cache.exist("key");

        expect(result).toBe(1);
      });

      it("should return 0 when key does not exist", async () => {
        mockRedisClient.exists.mockResolvedValue(0);

        const result = await cache.exist("non-existent");

        expect(result).toBe(0);
      });
    });

    describe("disconnect()", () => {
      it("should call quit on redis client", async () => {
        mockRedisClient.quit.mockResolvedValue("OK");

        await cache.disconnect();

        expect(mockRedisClient.quit).toHaveBeenCalled();
      });
    });
  });

  describe("Hash Operations", () => {
    describe("hset() / hget()", () => {
      it("should set and get hash field", async () => {
        mockRedisClient.hset.mockResolvedValue(1);
        mockRedisClient.hget.mockResolvedValue("field-value");

        await cache.hset("hash-key", "field", "field-value");
        const result = await cache.hget("hash-key", "field");

        expect(mockRedisClient.hset).toHaveBeenCalledWith(
          "hash-key",
          "field",
          "field-value"
        );
        expect(result).toBe("field-value");
      });

      it("should return null when field does not exist", async () => {
        mockRedisClient.hget.mockResolvedValue(null);

        const result = await cache.hget("hash-key", "non-existent");

        expect(result).toBeNull();
      });
    });

    describe("hgetall()", () => {
      it("should return all fields", async () => {
        const expected = { field1: "value1", field2: "value2" };
        mockRedisClient.hgetall.mockResolvedValue(expected);

        const result = await cache.hgetall("hash-key");

        expect(result).toEqual(expected);
      });
    });

    describe("hexists()", () => {
      it("should return 1 when field exists", async () => {
        mockRedisClient.hexists.mockResolvedValue(1);

        const result = await cache.hexists("hash-key", "field");

        expect(result).toBe(1);
      });

      it("should return 0 when field does not exist", async () => {
        mockRedisClient.hexists.mockResolvedValue(0);

        const result = await cache.hexists("hash-key", "non-existent");

        expect(result).toBe(0);
      });
    });

    describe("hdel()", () => {
      it("should delete multiple fields", async () => {
        mockRedisClient.hdel.mockResolvedValue(2);

        const result = await cache.hdel("hash-key", ["field1", "field2"]);

        expect(result).toBe(2);
        expect(mockRedisClient.hdel).toHaveBeenCalledWith(
          "hash-key",
          "field1",
          "field2"
        );
      });
    });
  });

  describe("JSON Operations", () => {
    describe("jsonset() / jsonget()", () => {
      it("should set and get JSON object", async () => {
        const obj = { name: "test", value: 123 };
        const pipeline = mockRedisClient.pipeline();
        pipeline.exec.mockResolvedValue([[null, "OK"]]);
        mockRedisClient.call.mockResolvedValue(JSON.stringify([obj]));

        await cache.jsonset("json-key", obj);
        const result = await cache.jsonget("json-key");

        expect(pipeline.call).toHaveBeenCalledWith(
          "JSON.SET",
          "json-key",
          "$",
          JSON.stringify(obj)
        );
        expect(result).toEqual([obj]);
      });

      it("should set JSON with path", async () => {
        const pipeline = mockRedisClient.pipeline();
        pipeline.exec.mockResolvedValue([[null, "OK"]]);

        await cache.jsonset("json-key", "value", "nested.path");

        expect(pipeline.call).toHaveBeenCalledWith(
          "JSON.SET",
          "json-key",
          "$.nested.path",
          JSON.stringify("value")
        );
      });

      it("should set JSON with TTL", async () => {
        const pipeline = mockRedisClient.pipeline();
        pipeline.exec.mockResolvedValue([[null, "OK"]]);

        await cache.jsonset("json-key", { data: 1 }, undefined, 3600);

        expect(pipeline.expire).toHaveBeenCalledWith("json-key", 3600);
      });

      it("should return undefined for invalid JSON", async () => {
        mockRedisClient.call.mockResolvedValue("invalid-json{");

        const result = await cache.jsonget("json-key");

        expect(result).toBeUndefined();
      });

      it("should return undefined when key does not exist", async () => {
        mockRedisClient.call.mockResolvedValue(null);

        const result = await cache.jsonget("non-existent");

        expect(result).toBeUndefined();
      });
    });

    describe("jsonmset() / jsonmget()", () => {
      it("should batch set JSON objects", async () => {
        const pipeline = mockRedisClient.pipeline();
        pipeline.exec.mockResolvedValue([[null, "OK"]]);

        const data = [
          { key: "key1", object: { a: 1 } },
          { key: "key2", object: { b: 2 } },
        ];

        await cache.jsonmset(data);

        expect(pipeline.call).toHaveBeenCalledWith("JSON.MSET", [
          "key1",
          "$",
          JSON.stringify({ a: 1 }),
          "key2",
          "$",
          JSON.stringify({ b: 2 }),
        ]);
      });

      it("should return null for empty array", async () => {
        const result = await cache.jsonmset([]);

        expect(result).toBeNull();
      });

      it("should batch get JSON objects", async () => {
        mockRedisClient.call.mockResolvedValue([
          JSON.stringify([{ a: 1 }]),
          JSON.stringify([{ b: 2 }]),
        ]);

        const keys = ["key1", "key2"];
        const keysCopy = [...keys];
        const result = await cache.jsonmget(keys);

        expect(result).toEqual([{ a: 1 }, { b: 2 }]);
        // Verify input array was not mutated
        expect(keys).toEqual(keysCopy);
      });

      it("should skip invalid JSON in jsonmget", async () => {
        mockRedisClient.call.mockResolvedValue([
          JSON.stringify([{ a: 1 }]),
          "invalid-json",
          null,
        ]);

        const result = await cache.jsonmget(["key1", "key2", "key3"]);

        expect(result).toEqual([{ a: 1 }]);
      });
    });
  });

  describe("Set Operations", () => {
    describe("sadd()", () => {
      it("should add member to set", async () => {
        mockRedisClient.sadd.mockResolvedValue(1);

        const result = await cache.sadd("set-key", "member");

        expect(result).toBe(1);
        expect(mockRedisClient.sadd).toHaveBeenCalledWith("set-key", "member");
      });
    });

    describe("sismember()", () => {
      it("should return true when member exists", async () => {
        mockRedisClient.sismember.mockResolvedValue(1);

        const result = await cache.sismember("set-key", "member");

        expect(result).toBe(true);
      });

      it("should return false when member does not exist", async () => {
        mockRedisClient.sismember.mockResolvedValue(0);

        const result = await cache.sismember("set-key", "non-existent");

        expect(result).toBe(false);
      });
    });

    describe("srem()", () => {
      it("should remove member from set", async () => {
        mockRedisClient.srem.mockResolvedValue(1);

        const result = await cache.srem("set-key", "member");

        expect(result).toBe(1);
      });
    });
  });

  describe("Sorted Set Operations", () => {
    describe("zadd()", () => {
      it("should add member with score", async () => {
        mockRedisClient.zadd.mockResolvedValue(1);

        const result = await cache.zadd("zset-key", "member", 100);

        expect(result).toBe(1);
        expect(mockRedisClient.zadd).toHaveBeenCalledWith(
          "zset-key",
          100,
          "member"
        );
      });
    });

    describe("zrem()", () => {
      it("should remove member", async () => {
        mockRedisClient.zrem.mockResolvedValue(1);

        const result = await cache.zrem("zset-key", "member");

        expect(result).toBe(1);
      });
    });

    describe("zrank() / zrevrank()", () => {
      it("should return rank", async () => {
        mockRedisClient.zrank.mockResolvedValue(0);
        mockRedisClient.zrevrank.mockResolvedValue(2);

        const rank = await cache.zrank("zset-key", "member");
        const revRank = await cache.zrevrank("zset-key", "member");

        expect(rank).toBe(0);
        expect(revRank).toBe(2);
      });

      it("should return null when member does not exist", async () => {
        mockRedisClient.zrank.mockResolvedValue(null);

        const result = await cache.zrank("zset-key", "non-existent");

        expect(result).toBeNull();
      });
    });

    describe("zscore()", () => {
      it("should return score", async () => {
        mockRedisClient.zscore.mockResolvedValue("100");

        const result = await cache.zscore("zset-key", "member");

        expect(result).toBe("100");
      });
    });

    describe("zcard()", () => {
      it("should return count", async () => {
        mockRedisClient.zcard.mockResolvedValue(5);

        const result = await cache.zcard("zset-key");

        expect(result).toBe(5);
      });
    });

    describe("zcount()", () => {
      it("should return count in range", async () => {
        mockRedisClient.zcount.mockResolvedValue(3);

        const result = await cache.zcount("zset-key", 0, 100);

        expect(result).toBe(3);
        expect(mockRedisClient.zcount).toHaveBeenCalledWith("zset-key", 0, 100);
      });

      it("should use default -inf/+inf", async () => {
        mockRedisClient.zcount.mockResolvedValue(10);

        await cache.zcount("zset-key");

        expect(mockRedisClient.zcount).toHaveBeenCalledWith(
          "zset-key",
          "-inf",
          "+inf"
        );
      });
    });

    describe("zremrangebyrank()", () => {
      it("should remove by rank range", async () => {
        mockRedisClient.zremrangebyrank.mockResolvedValue(3);

        const result = await cache.zremrangebyrank("zset-key", 0, 2);

        expect(result).toBe(3);
      });
    });
  });

  describe("List Operations", () => {
    describe("push()", () => {
      it("should push to left by default", async () => {
        mockRedisClient.lpush.mockResolvedValue(1);

        await cache.push("list-key", { data: 1 });

        expect(mockRedisClient.lpush).toHaveBeenCalledWith(
          "list-key",
          JSON.stringify({ data: 1 })
        );
      });

      it("should push to right", async () => {
        mockRedisClient.rpush.mockResolvedValue(1);

        await cache.push("list-key", { data: 1 }, "right");

        expect(mockRedisClient.rpush).toHaveBeenCalledWith(
          "list-key",
          JSON.stringify({ data: 1 })
        );
      });
    });

    describe("range()", () => {
      it("should return parsed items", async () => {
        mockRedisClient.lrange.mockResolvedValue([
          JSON.stringify({ a: 1 }),
          JSON.stringify({ b: 2 }),
        ]);

        const result = await cache.range("list-key");

        expect(result).toEqual([{ a: 1 }, { b: 2 }]);
      });

      it("should return raw string for invalid JSON", async () => {
        mockRedisClient.lrange.mockResolvedValue(["invalid-json", "also-invalid"]);

        const result = await cache.range("list-key");

        expect(result).toEqual(["invalid-json", "also-invalid"]);
      });

      it("should respect limit", async () => {
        mockRedisClient.lrange.mockResolvedValue([]);

        await cache.range("list-key", 10);

        expect(mockRedisClient.lrange).toHaveBeenCalledWith("list-key", 0, 9);
      });
    });

    describe("pop()", () => {
      it("should pop from left by default", async () => {
        mockRedisClient.lpop.mockResolvedValue(JSON.stringify({ data: 1 }));

        const result = await cache.pop("list-key");

        expect(result).toEqual({ data: 1 });
        expect(mockRedisClient.lpop).toHaveBeenCalledWith("list-key");
      });

      it("should pop from right", async () => {
        mockRedisClient.rpop.mockResolvedValue(JSON.stringify({ data: 1 }));

        const result = await cache.pop("list-key", "right");

        expect(result).toEqual({ data: 1 });
        expect(mockRedisClient.rpop).toHaveBeenCalledWith("list-key");
      });

      it("should return null for empty list", async () => {
        mockRedisClient.lpop.mockResolvedValue(null);

        const result = await cache.pop("list-key");

        expect(result).toBeNull();
      });

      it("should return raw string for invalid JSON", async () => {
        mockRedisClient.lpop.mockResolvedValue("not-json");

        const result = await cache.pop("list-key");

        expect(result).toBe("not-json");
      });
    });

    describe("length()", () => {
      it("should return list length", async () => {
        mockRedisClient.llen.mockResolvedValue(5);

        const result = await cache.length("list-key");

        expect(result).toBe(5);
      });
    });

    describe("trim()", () => {
      it("should trim list", async () => {
        mockRedisClient.ltrim.mockResolvedValue("OK");

        await cache.trim("list-key", 0, 99);

        expect(mockRedisClient.ltrim).toHaveBeenCalledWith("list-key", 0, 99);
      });
    });
  });
});

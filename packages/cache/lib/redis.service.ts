import { Pagination } from "@blazjs/common";
import Redis, { RedisOptions } from "ioredis";
import { CacheProvider } from "./providers/cache.provider";
import { HashCacheProvider } from "./providers/hash-cache.provider";
import { JsonCacheProvider } from "./providers/json-cache.provider";
import { ListCacheProvider } from "./providers/list-cache.provider";
import { SetCacheProvider } from "./providers/set-cache.provider";
import { SortedSetCacheProvider } from "./providers/sorted-set-cache.provider";

export class RedisCacheService
  implements
    CacheProvider,
    HashCacheProvider,
    JsonCacheProvider,
    SetCacheProvider,
    SortedSetCacheProvider,
    ListCacheProvider
{
  readonly redisClient: Redis;

  constructor(options: RedisOptions) {
    this.redisClient = new Redis(options);
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const pipeline = this.redisClient.pipeline().set(key, value);
    if (ttl) {
      pipeline.expire(key, ttl);
    }
    await pipeline.exec();
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key);
  }

  async exist(key: string) {
    return this.redisClient.exists(key);
  }

  async hget(key: string, field: string) {
    return this.redisClient.hget(key, field);
  }

  async hset(key: string, field: string, value: string) {
    await this.redisClient.hset(key, field, value);
  }

  async hgetall(key: string) {
    return this.redisClient.hgetall(key);
  }

  async hexists(key: string, field: string) {
    return this.redisClient.hexists(key, field);
  }

  async hdel(key: string, fields: string[]): Promise<number> {
    return this.redisClient.hdel(key, ...fields);
  }

  async jsonset(key: string, object: unknown, path?: string, ttl?: number) {
    path = path ? `$.${path}` : "$";
    const pipeline = this.redisClient
      .pipeline()
      .call("JSON.SET", key, path, JSON.stringify(object));
    if (ttl) {
      pipeline.expire(key, ttl);
    }
    return await pipeline.exec();
  }

  async jsonmset(
    data: { key: string; object: unknown; path?: string }[],
    ttl?: number
  ) {
    if (!data.length) return;

    const pipeline = this.redisClient.pipeline();
    const args = data.flatMap(({ key, object, path }) => [
      key,
      path ? `$.${path}` : "$",
      JSON.stringify(object),
    ]);

    pipeline.call("JSON.MSET", args);
    if (ttl) {
      data.forEach(({ key }) => pipeline.expire(key, ttl));
    }

    await pipeline.exec();
  }

  async jsonget(key: string, path?: string) {
    path = path ? `$.${path}` : "$";
    const res = await this.redisClient.call("JSON.GET", key, path);

    if (typeof res !== "string") return;
    return JSON.parse(res);
  }

  async jsonmget(keys: string[], path?: string) {
    keys.push(path ? `$.${path}` : "$");
    const results = await this.redisClient.call("JSON.MGET", keys);

    if (!Array.isArray(results)) return [];

    const parseds = results
      .map((res) => {
        return <[]>JSON.parse(res);
      })
      .flat();

    return parseds;
  }

  async zadd(key: string, member: string, score: number) {
    return this.redisClient.zadd(key, score, member);
  }

  async zmadd(
    data: { key: string; member: string; score: number }[],
    ttl?: number
  ) {
    const pipeline = this.redisClient.pipeline();
    for (const { key, member, score } of data) {
      pipeline.zadd(key, score, member);
      if (ttl) {
        pipeline.expire(key, ttl);
      }
    }
    return await pipeline.exec();
  }

  async zrem(key: string, member: string) {
    return this.redisClient.zrem(key, member);
  }

  async zrems(key: string, members: string[]) {
    const pipeline = this.redisClient.pipeline();
    for (const member of members) {
      pipeline.zrem(key, member);
    }
    return await pipeline.exec();
  }

  async zrevrange(key: string, pagination: Pagination) {
    const res = await this.redisClient.zrange(
      key,
      "+inf",
      0,
      "BYSCORE",
      "REV",
      "LIMIT",
      pagination.getOffset(),
      pagination.limit,
      "WITHSCORES"
    );
    return chunk(res, 2).map(([member, score]) => ({
      member,
      score,
    }));
  }

  async zrevrangebyscore(key: string, pagination: Pagination) {
    return this.redisClient.zrange(
      key,
      "+inf",
      0,
      "BYSCORE",
      "REV",
      "LIMIT",
      pagination.getOffset(),
      pagination.limit
    );
  }

  async zrank(key: string, member: string) {
    return this.redisClient.zrank(key, member);
  }

  async zrevrank(key: string, member: string) {
    return this.redisClient.zrevrank(key, member);
  }

  async zscore(key: string, member: string) {
    return this.redisClient.zscore(key, member);
  }

  async zcard(key: string) {
    return this.redisClient.zcard(key);
  }

  async zcount(
    key: string,
    min: number | string = "-inf",
    max: number | string = "+inf"
  ) {
    return this.redisClient.zcount(key, min, max);
  }

  async zremrangebyrank(key: string, start: number, stop: number) {
    return this.redisClient.zremrangebyrank(key, start, stop);
  }

  async zscan(key: string, match: string, cursor = 0, count?: number) {
    if (count) {
      return this.redisClient.zscan(
        key,
        cursor,
        "MATCH",
        match,
        "COUNT",
        count
      );
    }
    return this.redisClient.zscan(key, cursor, "MATCH", match);
  }

  async sadd(key: string, member: string) {
    return this.redisClient.sadd(key, member);
  }

  async sismember(key: string, member: string) {
    return (await this.redisClient.sismember(key, member)) === 1;
  }

  async sismembers(key: string, members: string[]) {
    const pipeline = this.redisClient.pipeline();
    for (const member of members) {
      pipeline.sismember(key, member);
    }
    return await pipeline.exec();
  }

  async srem(key: string, member: string) {
    return this.redisClient.srem(key, member);
  }

  async mexpire(data: { key: string; ttl: number }[]) {
    const pipeline = this.redisClient.pipeline();
    for (const { key, ttl } of data) {
      pipeline.expire(key, ttl);
    }
    return await pipeline.exec();
  }

  async push(
    key: string,
    value: unknown,
    type: "left" | "right" = "left"
  ): Promise<void> {
    type === "left"
      ? await this.redisClient.lpush(key, JSON.stringify(value))
      : await this.redisClient.rpush(key, JSON.stringify(value));
  }

  async range(key: string, limit?: number): Promise<unknown[]> {
    const res = await this.redisClient.lrange(key, 0, limit ? limit - 1 : -1);
    return res.map((item) => JSON.parse(item));
  }

  async pop(
    key: string,
    type: "left" | "right" = "left"
  ): Promise<unknown | null> {
    const res =
      type === "left"
        ? await this.redisClient.lpop(key)
        : await this.redisClient.rpop(key);
    return res ? JSON.parse(res) : null;
  }

  async length(key: string): Promise<number> {
    return this.redisClient.llen(key);
  }

  async trim(key: string, start: number, end: number): Promise<void> {
    await this.redisClient.ltrim(key, start, end);
  }
}

const chunk = <T>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
};

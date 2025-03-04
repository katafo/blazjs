import { Pagination } from "@blazjs/common";

export interface SortedSetCacheProvider {
  zadd(key: string, member: string, score: number): Promise<number>;

  zmadd(
    data: { key: string; member: string; score: number }[],
    ttl?: number
  ): Promise<[Error | null, unknown][] | null>;

  zrem(key: string, member: string): Promise<number>;

  zrems(
    key: string,
    members: string[]
  ): Promise<[Error | null, unknown][] | null>;

  zrevrange(
    key: string,
    pagination: Pagination
  ): Promise<
    {
      member: string;
      score: string;
    }[]
  >;

  zrevrangebyscore(key: string, pagination: Pagination): Promise<string[]>;

  zrank(key: string, member: string): Promise<number | null>;

  zrevrank(key: string, member: string): Promise<number | null>;

  zscore(key: string, member: string): Promise<string | null>;

  zcard(key: string): Promise<number>;

  zcount(
    key: string,
    min: number | string,
    max: number | string
  ): Promise<number>;

  zremrangebyrank(key: string, start: number, stop: number): Promise<number>;

  zscan(
    key: string,
    match: string,
    cursor: number,
    count?: number
  ): Promise<[cursor: string, elements: string[]]>;
}

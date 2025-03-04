export interface HashCacheProvider {
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hgetall(key: string): Promise<{ [field: string]: string }>;
  hexists(key: string, field: string): Promise<number>;
  hdel(key: string, fields: string[]): Promise<number>;
}

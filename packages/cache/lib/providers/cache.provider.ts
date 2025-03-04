export interface CacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<number>;
  exist(key: string): Promise<number>;
  mexpire(
    data: { key: string; ttl: number }[]
  ): Promise<[error: Error | null, result: unknown][] | null>;
}

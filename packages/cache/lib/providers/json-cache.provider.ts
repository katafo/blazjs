export interface JsonCacheProvider {
  jsonset(
    key: string,
    object: unknown,
    path?: string,
    ttl?: number
  ): Promise<[error: Error | null, result: unknown][] | null>;

  jsonmset(
    data: { key: string; object: unknown; path?: string }[],
    ttl?: number
  ): Promise<[error: Error | null, result: unknown][] | null | void>;

  jsonget<T>(key: string, path?: string): Promise<T[] | undefined>;

  jsonmget<T>(keys: string[], path?: string): Promise<T[]>;
}

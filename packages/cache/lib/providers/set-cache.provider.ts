export interface SetCacheProvider {
  sadd(key: string, member: string): Promise<number>;
  sismember(key: string, member: string): Promise<boolean>;
  sismembers(
    key: string,
    members: string[]
  ): Promise<[error: Error | null, result: unknown][] | null>;
  srem(key: string, member: string): Promise<number>;
}

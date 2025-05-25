export interface ListCacheProvider {
  push(key: string, value: unknown, type: "left" | "right"): Promise<void>;
  range(key: string, limit?: number): Promise<unknown[]>;
  pop(key: string, type: "left" | "right"): Promise<unknown | null>;
  length(key: string): Promise<number>;
  trim(key: string, start: number, end: number): Promise<void>;
}

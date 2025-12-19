export interface LoggerOptions {
  /**
   * Enable file transport.
   * @default true
   */
  fileTransport?: {
    enabled: boolean;
    maxSize?: number;
    maxFiles?: number;
    level?: string;
  };

  /** Keys to be sanitized in logs
   * @default []
   */
  sanitizeKeys?: string[];

  /** Include caller info (file:line) in log messages
   * @default false
   */
  includeCallerInfo?: boolean;
}

export interface ILogger {
  log(level: string, message: string, ...meta: any[]): void;
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, ...meta: any[]): void;
  add(transport: any): void;
}

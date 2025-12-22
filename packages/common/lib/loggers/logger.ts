import { NextFunction, Request, Response } from "express";
import { ErrorResp } from "../responses";
import { ILogger, LoggerOptions } from "./logger.interface";

export abstract class Logger {
  protected logger: ILogger;
  protected options: LoggerOptions;

  /**
   * Extract caller information (file, line, function) from stack trace.
   * @param stackLevel - How many levels up the stack to look (default: 3)
   */
  private getCallerInfo(stackLevel = 3): { file: string; line: string; func: string } | null {
    const stack = new Error().stack;
    if (!stack) return null;

    const lines = stack.split("\n");
    // Skip "Error" line and specified stack levels
    const callerLine = lines[stackLevel];
    if (!callerLine) return null;

    // Parse stack trace line: "at functionName (/path/to/file.ts:10:5)"
    // or "at /path/to/file.ts:10:5"
    const match = callerLine.match(/at\s+(?:(.+?)\s+)?\(?(.+):(\d+):\d+\)?/);
    if (!match) return null;

    const func = match[1] || "anonymous";
    const fullPath = match[2];
    const line = match[3];

    // Extract just filename from full path
    const file = fullPath.split("/").pop() || fullPath;

    return { file, line, func };
  }

  /**
   * Mask the keys in the data object.
   * @param data - The data object to be masked.
   */
  mask(data: any) {
    const keys = new Set(this.options.sanitizeKeys ?? []);
    if (!keys.size) return data;
    if (typeof data === "object" && data !== null) {
      return JSON.parse(
        JSON.stringify(data, (key, value) =>
          keys.has(key) ? "<REDACTED>" : value
        )
      );
    }
    return data;
  }

  /**
   * Format the request object for logging.
   * @param req: Express Request
   */
  request(req: Request): object {
    return {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userId: req["userId"],
      headers: this.mask(req.headers),
      body: this.mask(req.body),
      query: req.query,
      params: req.params,
    };
  }

  /**
   * Set the keys to be sanitized in the logs.
   * @param keys
   */
  setSanitizeKeys(keys: string[]) {
    this.options.sanitizeKeys = keys;
  }

  /**
   * Add keys to be sanitized in the logs. Existing keys will be retained.
   * @param keys
   */
  addSanitizeKeys(keys: string[]) {
    this.options.sanitizeKeys = [...(this.options.sanitizeKeys ?? []), ...keys];
  }

  /**
   * Express middleware to log the error message.
   */
  errorLogMiddleware(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const log = {
      request: this.request(req),
      error: {
        name: err.name,
        code: err["code"],
        message: err.message,
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
      },
    };
    if (err instanceof ErrorResp) {
      // Log only UNAUTHORIZED, FORBIDEN, TOO_MANY_REQUEST errors
      if ([401, 403, 429].includes(err.status)) {
        this.warn(err.message, log);
      } else {
        this.debug(err.message, log);
      }
    } else {
      // Log all other internal server errors
      this.error(err.message, log);
    }
    next(err);
  }

  private formatMessage(message: string): string {
    if (!this.options.includeCallerInfo) {
      return message;
    }
    const caller = this.getCallerInfo();
    const prefix = caller ? `[${caller.file}:${caller.line}]` : "";
    return `${prefix} ${message}`;
  }

  log(level: string, message: string, ...meta: any[]) {
    this.logger.log(level, this.formatMessage(message), ...meta);
  }

  debug(message: string, ...meta: any[]) {
    this.logger.debug(this.formatMessage(message), ...meta);
  }

  info(message: string, ...meta: any[]) {
    this.logger.info(this.formatMessage(message), ...meta);
  }

  warn(message: string, ...meta: any[]) {
    this.logger.warn(this.formatMessage(message), ...meta);
  }

  error(message: string, ...meta: any[]) {
    this.logger.error(this.formatMessage(message), ...meta);
  }
}

import winston from "winston";
import { Logger } from "./logger";
import { LoggerOptions } from "./logger.interface";
const { combine, timestamp, prettyPrint, colorize, printf } = winston.format;

export const SANITIZED_KEYS = [
  "password",
  "token",
  "cvv",
  "privateKey",
  "secretKey",
  "apiKey",
  "authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
  "x-access-token",
];

export class DefaultLogger extends Logger {
  protected options: LoggerOptions = {
    fileTransport: {
      enabled: true,
    },
    sanitizeKeys: SANITIZED_KEYS,
  };
  constructor(options?: LoggerOptions) {
    super();
    // override default options
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // create logger
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: combine(timestamp()),
      transports: [
        new winston.transports.Console({
          format: combine(
            winston.format((info) => {
              info.level = `[${info.level.toUpperCase()}]`;
              return info;
            })(),
            colorize(),
            printf(({ timestamp, level, message }) => {
              return `${level} ${message} [${timestamp}]`;
            })
          ),
        }),
      ],
    });

    // add file transport
    const fileOpts = this.options.fileTransport;
    if (fileOpts?.enabled) {
      // alway add file trransport for 'error' logs
      this.logger.add(
        new winston.transports.File({
          filename: "logs/error.log",
          maxsize: fileOpts?.maxSize || 10 * 1024 * 1024,
          maxFiles: fileOpts?.maxFiles || 1,
          format: combine(prettyPrint()),
          level: "error",
        })
      );
      // if level is not 'error', add another file transport for 'info' logs
      if (fileOpts?.level !== "error") {
        this.logger.add(
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: fileOpts?.maxSize || 10 * 1024 * 1024,
            maxFiles: fileOpts?.maxFiles || 1,
            format: combine(prettyPrint()),
            level: fileOpts.level || "info",
          })
        );
      }
    }
  }
}

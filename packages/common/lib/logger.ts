import winston from "winston";
const { combine, timestamp, prettyPrint, colorize, printf } = winston.format;

const LOG_FORMAT = [timestamp(), prettyPrint()];

const CONSOLE_LOG_FORMAT = [
  timestamp(),
  winston.format((info) => {
    info.level = `[${info.level.toUpperCase()}]`;
    return info;
  })(),
  colorize(),
  printf(({ timestamp, level, message }) => {
    return `${level} ${message} [${timestamp}]`;
  }),
];

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      maxsize: 10 * 1024 * 1024,
      format: combine(...LOG_FORMAT),
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 10 * 1024 * 1024,
      format: combine(...LOG_FORMAT),
      level: "info",
    }),
    new winston.transports.Console({
      format: combine(...CONSOLE_LOG_FORMAT),
    }),
  ],
});

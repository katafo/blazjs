import winston from "winston";
const { combine, timestamp, colorize, printf } = winston.format;

const LOG_FORMAT = [
  timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format((info) => {
    info.level = `[${info.level.toUpperCase()}]`;
    return info;
  })(),
];

const PRINTF_FORMAT = printf(({ timestamp, level, message }) => {
  return `${level} ${message} [${timestamp}]`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "error" : undefined,
  format: combine(...LOG_FORMAT),
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      maxsize: 10 * 1024 * 1024,
      format: combine(PRINTF_FORMAT),
      level: "error",
    }),
    new winston.transports.Console({
      format: combine(colorize(), PRINTF_FORMAT),
    }),
  ],
});

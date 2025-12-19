import cors, { CorsOptions } from "cors";
import express, {
  ErrorRequestHandler,
  json,
  RequestHandler,
  urlencoded,
} from "express";
import helmet, { HelmetOptions } from "helmet";
import http from "http";
import { DefaultLogger, Logger } from "./loggers";
import { errorRequestHandler } from "./responses";
import { AppRoute } from "./routes/app.route";

export interface AppOptions {
  /** Enable trust proxy to get the client IP address.
   * @default true
   */
  trustProxy?: boolean;

  /** Config CORS.
   * @default true
   */
  cors?: {
    enabled: boolean;
    options?: CorsOptions;
  };

  /** Config Helmet.
   * @default true
   */
  helmet?: {
    enabled: boolean;
    options?: HelmetOptions;
  };

  /** Logger */
  logger?: Logger;

  /** Health check endpoint configuration.
   * @default { enabled: true, path: "/health" }
   */
  healthCheck?: {
    enabled: boolean;
    path?: string;
  };

  /** Request timeout in milliseconds.
   * Set to 0 to disable timeout.
   * @default 30000 (30 seconds)
   */
  requestTimeout?: number;
}

export class App {
  private routes: AppRoute[] = [];
  private app: express.Express;
  private server?: http.Server;
  private middlewares: RequestHandler[] = [];
  private _errorRequestHandler: ErrorRequestHandler = errorRequestHandler;
  private logger: Logger;

  private options: AppOptions = {
    cors: {
      enabled: true,
    },
    helmet: {
      enabled: true,
    },
    trustProxy: true,
    healthCheck: {
      enabled: true,
      path: "/health",
    },
    requestTimeout: 30000,
  };

  constructor(options?: AppOptions) {
    this.app = express();
    // override default options
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.logger = options?.logger ? options.logger : new DefaultLogger();
  }

  /**
   * Sets a setting value for the Express application.
   * @param key - The setting name
   * @param value - The setting value
   */
  set(key: string, value: unknown): void {
    this.app.set(key, value);
  }

  /**
   * Sets up the middlewares for the application.
   * @param handlers - The middleware handlers to be used.
   */
  registerMiddlewares(...handlers: RequestHandler[]) {
    this.middlewares.push(...handlers);
  }

  /**
   * Adds the provided routes to the application.
   * @param routes
   */
  registerRoutes(...routes: AppRoute[]) {
    this.routes.push(...routes);
  }

  private setupMiddlewares() {
    if (this.middlewares.length) {
      this.app.use(...this.middlewares);
    }
  }

  /**
   * Normalizes a path by joining segments and removing duplicate slashes.
   */
  private normalizePath(...segments: (string | undefined)[]): string {
    return (
      "/" +
      segments
        .filter((s): s is string => Boolean(s))
        .join("/")
        .replace(/\/+/g, "/")
        .replace(/^\/|\/$/g, "")
    );
  }

  /**
   * Sets up the application routes by iterating over the provided routes and groups,
   * and initializing them with their respective paths and routers.
   */
  private setupRoutes() {
    this.routes.forEach((route) => {
      // init group routes
      route.groups?.forEach((group) => {
        group.routes.forEach((clsRoute) => {
          const routePath = this.normalizePath(
            route.version,
            group.group,
            clsRoute.route
          );
          this.app.use(routePath, clsRoute.router);
        });
      });

      // init routes
      route.routes?.forEach((clsRoute) => {
        const routePath = this.normalizePath(route.version, clsRoute.route);
        this.app.use(routePath, clsRoute.router);
      });
    });
  }

  /**
   * Sets up custom error request handler for the application.
   * @param handler - The error handler to be used.
   */
  registerErrorHandler(handler: ErrorRequestHandler) {
    if (handler) {
      this._errorRequestHandler = handler;
    }
  }

  private setupHealthCheck() {
    const healthConfig = this.options.healthCheck;
    if (healthConfig?.enabled) {
      const path = healthConfig.path || "/health";
      this.app.get(path, (_req, res) => {
        res.json({
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  private setupRequestTimeout() {
    const timeout = this.options.requestTimeout;
    if (timeout && timeout > 0) {
      this.app.use((_req, res, next) => {
        const timer = setTimeout(() => {
          if (!res.headersSent) {
            res.status(408).json({
              error: {
                code: "error.requestTimeout",
                message: "Request timeout",
              },
            });
          }
        }, timeout);

        // Clear timer when response completes
        res.on("finish", () => clearTimeout(timer));
        res.on("close", () => clearTimeout(timer));

        next();
      });
    }
  }

  private setupProcessHandlers() {
    process.on("uncaughtException", (err) => {
      this.logger.error("Uncaught Exception", err);
    });

    process.on("unhandledRejection", (reason, promise) => {
      this.logger.error(
        `Unhandled Rejection at: Promise ${JSON.stringify({
          promise,
          reason,
        })}`
      );
    });
  }

  /**
   * Starts the application by listening on the provided port.
   */
  async listen(port: number) {
    try {
      if (this.options.trustProxy) {
        // enable trust proxy to get the client IP address
        this.app.set("trust proxy", true);
      }

      // default middlewares
      this.app.use(json(), urlencoded({ extended: true }));

      // cors
      const corsConfig = this.options.cors;
      if (corsConfig?.enabled) {
        this.app.use(corsConfig.options ? cors(corsConfig.options) : cors());
      }

      // helmet
      const helmetConfig = this.options.helmet;
      if (helmetConfig?.enabled) {
        this.app.use(
          helmetConfig.options ? helmet(helmetConfig.options) : helmet()
        );
      }

      this.setupRequestTimeout();
      this.setupHealthCheck();
      this.setupMiddlewares();
      this.setupRoutes();
      this.setupProcessHandlers();

      // handle error request
      this.app.use(this.logger.errorLogMiddleware.bind(this.logger));
      this.app.use(this._errorRequestHandler);

      await new Promise<void>((resolve, reject) => {
        this.server = this.app
          .listen(port, () => {
            this.logger.info(`Server is listening at port ${port}`);
            resolve();
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    } catch (error) {
      this.logger.error("Error starting server", error);
      process.exit(1);
    }
  }

  /**
   * Gracefully shutdown the server.
   */
  async close(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      this.server!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

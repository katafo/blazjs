import express, { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "./logger";
import { errorRequestHandler } from "./responses";
import { AppRoute } from "./routes/app.route";

export interface AppOptions {
  trustProxy?: boolean;
}

export class App {
  private routes: AppRoute[] = [];
  private app: express.Express;
  private middlewares: RequestHandler[] = [];
  private errorHandler: ErrorRequestHandler;
  private sanitizedLogKeys: Set<string> = new Set();

  constructor(options?: AppOptions) {
    this.app = express();
    if (options?.trustProxy) {
      this.app.set("trust proxy", true);
    }
  }

  set(key: string, value: any) {
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
   * Sets up the application routes by iterating over the provided routes and groups,
   * and initializing them with their respective paths and routers.
   */
  private setupRoutes() {
    this.routes.forEach((route) => {
      let path = "/";
      if (route.version) {
        path += route.version + "/";
      }
      // init group routes
      route.groups?.forEach((group) => {
        group.routes.forEach((clsRoute) => {
          const routePath = path + group.group + "/" + (clsRoute.route ?? "");
          this.app.use(routePath, clsRoute.router);
        });
      });

      // init routes
      route.routes?.forEach((clsRoute) => {
        const routePath = path + (clsRoute.route ?? "");
        this.app.use(routePath, clsRoute.router);
      });
    });
  }

  /**
   * Sets up the sensitive keys that should be masked in the logs.
   */
  sanitizeLogs(keys: string[]) {
    this.sanitizedLogKeys = new Set(keys);
  }

  /**
   * Sets up custom error request handler for the application.
   * @param handler - The error handler to be used.
   */
  setupErrorHandler(handler: ErrorRequestHandler) {
    if (handler) {
      this.errorHandler = handler;
    }
  }

  private setupProcessHandlers() {
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception", err);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error(
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
      this.setupMiddlewares();
      this.setupRoutes();
      this.app.use(
        this.errorHandler ??
          errorRequestHandler.bind(null, this.sanitizedLogKeys)
      );
      this.setupProcessHandlers();

      await new Promise<void>((resolve, reject) => {
        this.app
          .listen(port, () => {
            logger.info(`Server is listening at port ${port}`);
            resolve();
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    } catch (error) {
      logger.error("Error starting server", error);
      process.exit(1);
    }
  }
}

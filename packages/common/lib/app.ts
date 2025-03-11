import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import { logger } from "./logger";
import { errorHandler } from "./responses/error-handler";
import { AppRoute } from "./routes/app.route";

export interface AppOptions {
  trustProxy?: boolean;
}

export class App {
  private routes: AppRoute[] = [];
  private app: express.Express;
  private middlewares: RequestHandler[] = [];

  constructor(options?: AppOptions) {
    this.app = express();
    if (options?.trustProxy) {
      this.app.set("trust proxy", true);
    }
  }

  /**
   * Sets up the middlewares for the Express application.
   * @param handlers - The middleware handlers to be used.
   */
  use(...handlers: RequestHandler[]) {
    this.middlewares.push(...handlers);
  }

  private setupMiddlewares() {
    if (this.middlewares.length) {
      this.app.use(...this.middlewares);
    }
  }

  set(key: string, value: any) {
    this.app.set(key, value);
  }

  /**
   * Adds the provided routes to the application.
   * @param routes
   */
  registerRoutes(...routes: AppRoute[]) {
    this.routes.push(...routes);
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
   * Sets up the error handlers for the Express application.
   */
  private setupErrorHandlers() {
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        errorHandler(err, res);
      }
    );
  }

  /**
   * Starts the Express application by listening on the provided port.
   * @param initialize - An optional function to be executed before starting the server.
   */
  async listen(port: number, initialize?: () => Promise<void>) {
    const startTime = Date.now();

    if (initialize) {
      await initialize();
    }

    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandlers();

    // start server
    this.app.listen(port, () => {
      return logger.info(
        `Server is listening at port ${port} - Elapsed time: ${
          (Date.now() - startTime) / 1000
        }s`
      );
    });

    process.on("uncaughtException", (err) => {
      logger.error(err);
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
}

import cors from "cors";
import express, {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  json,
  urlencoded,
} from "express";
import helmet from "helmet";
import { Config } from "./config";
import { errorHandler } from "./error-handler";
import { logger } from "./logger";
import { AppRoute } from "./routes/app.route";

export const DEFAULT_MIDDLEWARES = [
  cors(),
  helmet(),
  json(),
  urlencoded({ extended: true }),
];

export class App {
  config: Config;
  routes: AppRoute[];
  app: express.Express;

  constructor(
    config: Config,
    routes: AppRoute[],
    middlewares: express.RequestHandler[] = DEFAULT_MIDDLEWARES
  ) {
    this.app = express();
    this.config = config;
    this.routes = routes;
    this.setupMiddlewares(...middlewares);
    this.setupRoutes();
  }

  /**
   * Sets up the middlewares for the Express application.
   * @param handlers - The middleware handlers to be used.
   */
  private setupMiddlewares(...handlers: RequestHandler[]) {
    // trust proxy to get client ip
    this.app.set("trust proxy", true);
    this.app.use(handlers);
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

    // error handler
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
  async start(initialize?: () => Promise<void>) {
    const startTime = Date.now();

    if (initialize) {
      await initialize();
    }

    // start server
    this.app.listen(this.config.port, () => {
      return logger.info(
        `Server is listening at port ${this.config.port} - Elapsed time: ${
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

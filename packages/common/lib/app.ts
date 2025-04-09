import { MetricClient } from "@blazjs/metric";
import cors, { CorsOptions } from "cors";
import express, {
  ErrorRequestHandler,
  json,
  RequestHandler,
  urlencoded,
} from "express";
import helmet, { HelmetOptions } from "helmet";
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

  /** Metric */
  metric?: MetricClient;
}

export class App {
  private routes: AppRoute[] = [];
  private app: express.Express;
  private middlewares: RequestHandler[] = [];
  private _errorRequestHandler: ErrorRequestHandler = errorRequestHandler;
  private logger: Logger;
  private metric: MetricClient;

  private options: AppOptions = {
    cors: {
      enabled: true,
    },
    helmet: {
      enabled: true,
    },
    trustProxy: true,
  };

  constructor(options?: AppOptions) {
    this.app = express();
    // override default options
    if (options) {
      this.options = { ...this.options, ...options };
    }
    this.logger = options?.logger ?? new DefaultLogger();
    this.metric = options?.metric ?? new MetricClient();
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
   * Sets up custom error request handler for the application.
   * @param handler - The error handler to be used.
   */
  registerErrorHandler(handler: ErrorRequestHandler) {
    if (handler) {
      this._errorRequestHandler = handler;
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

  private setupMetric() {
    this.app.use("/metrics", async (_, res) => {
      res.setHeader("Content-Type", this.metric.contentType());
      res.send(await this.metric.metrics());
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

      this.setupMiddlewares();
      this.setupRoutes();
      this.setupMetric();
      this.setupProcessHandlers();

      // handle error request
      this.app.use(this.logger.errorLogMiddleware.bind(this.logger));
      this.app.use(this._errorRequestHandler);

      await new Promise<void>((resolve, reject) => {
        this.app
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
}

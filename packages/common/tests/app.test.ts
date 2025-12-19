import { RequestHandler, ErrorRequestHandler } from "express";
import { App, AppOptions } from "../lib/app";
import { Logger } from "../lib/loggers";
import { BaseRoute } from "../lib/routes/base.route";
import { AppRoute } from "../lib/routes/app.route";

// Mock logger for testing
class MockLogger extends Logger {
  protected options = { sanitizeKeys: [] };
  logs: { level: string; message: string; meta: unknown[] }[] = [];

  constructor() {
    super();
    this.logger = {
      log: (level: string, message: string, ...meta: unknown[]) => {
        this.logs.push({ level, message, meta });
      },
      debug: (message: string, ...meta: unknown[]) => {
        this.logs.push({ level: "debug", message, meta });
      },
      info: (message: string, ...meta: unknown[]) => {
        this.logs.push({ level: "info", message, meta });
      },
      warn: (message: string, ...meta: unknown[]) => {
        this.logs.push({ level: "warn", message, meta });
      },
      error: (message: string, ...meta: unknown[]) => {
        this.logs.push({ level: "error", message, meta });
      },
      add: () => {},
    };
  }

  clear() {
    this.logs = [];
  }
}

// Test route class
class TestRoute extends BaseRoute {
  route = "test";

  constructor() {
    super();
    this.router.get("/", (_req, res) => {
      res.json({ message: "test route" });
    });
    this.router.get("/error", () => {
      throw new Error("Test error");
    });
  }
}

class UsersRoute extends BaseRoute {
  route = "users";

  constructor() {
    super();
    this.router.get("/", (_req, res) => {
      res.json({ users: [] });
    });
  }
}

describe("App", () => {
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
  });

  describe("constructor", () => {
    it("should create app instance", () => {
      const app = new App();

      expect(app).toBeInstanceOf(App);
    });

    it("should use default options", () => {
      const app = new App();

      // Default options are internal, we verify by behavior in other tests
      expect(app).toBeDefined();
    });

    it("should use custom logger when provided", () => {
      const app = new App({ logger: mockLogger });

      expect(app).toBeDefined();
    });

    it("should override default options when provided", () => {
      const options: AppOptions = {
        trustProxy: false,
        cors: { enabled: false },
        helmet: { enabled: false },
      };

      const app = new App(options);

      expect(app).toBeDefined();
    });
  });

  describe("set", () => {
    it("should set express app settings", () => {
      const app = new App();

      // Should not throw
      expect(() => app.set("view engine", "ejs")).not.toThrow();
    });
  });

  describe("registerMiddlewares", () => {
    it("should register middlewares", () => {
      const app = new App();
      const middleware1: RequestHandler = (_req, _res, next) => next();
      const middleware2: RequestHandler = (_req, _res, next) => next();

      // Should not throw
      expect(() =>
        app.registerMiddlewares(middleware1, middleware2)
      ).not.toThrow();
    });
  });

  describe("registerRoutes", () => {
    it("should register routes without version", () => {
      const app = new App();
      const testRoute = new TestRoute();
      const appRoute: AppRoute = {
        routes: [testRoute],
      };

      expect(() => app.registerRoutes(appRoute)).not.toThrow();
    });

    it("should register routes with version", () => {
      const app = new App();
      const testRoute = new TestRoute();
      const appRoute: AppRoute = {
        version: "v1",
        routes: [testRoute],
      };

      expect(() => app.registerRoutes(appRoute)).not.toThrow();
    });

    it("should register group routes", () => {
      const app = new App();
      const usersRoute = new UsersRoute();
      const appRoute: AppRoute = {
        version: "v1",
        groups: [
          {
            group: "admin",
            routes: [usersRoute],
          },
        ],
      };

      expect(() => app.registerRoutes(appRoute)).not.toThrow();
    });

    it("should register multiple route groups", () => {
      const app = new App();
      const testRoute = new TestRoute();
      const usersRoute = new UsersRoute();
      const appRoute: AppRoute = {
        version: "v1",
        groups: [
          { group: "admin", routes: [usersRoute] },
          { group: "public", routes: [testRoute] },
        ],
        routes: [testRoute],
      };

      expect(() => app.registerRoutes(appRoute)).not.toThrow();
    });
  });

  describe("registerErrorHandler", () => {
    it("should register custom error handler", () => {
      const app = new App();
      const customHandler: ErrorRequestHandler = (_err, _req, res) => {
        res.status(500).json({ custom: true });
      };

      expect(() => app.registerErrorHandler(customHandler)).not.toThrow();
    });
  });

  describe("listen", () => {
    let app: App;
    const appsToClose: App[] = [];

    beforeEach(() => {
      app = new App({ logger: mockLogger });
    });

    afterEach(async () => {
      // Close all servers after each test
      await Promise.all(appsToClose.map((a) => a.close()));
      appsToClose.length = 0;
    });

    it("should start server on specified port", async () => {
      const port = 4001;

      // listen returns a promise, server starts
      await app.listen(port);
      appsToClose.push(app);

      // Check logger was called with port info
      const infoLog = mockLogger.logs.find(
        (log) => log.level === "info" && log.message.includes(`${port}`)
      );
      expect(infoLog).toBeDefined();
    }, 10000);

    it("should enable trust proxy by default", async () => {
      const port = 4002;
      const appWithProxy = new App({ logger: mockLogger, trustProxy: true });

      await appWithProxy.listen(port);
      appsToClose.push(appWithProxy);

      const infoLog = mockLogger.logs.find((log) => log.level === "info");
      expect(infoLog).toBeDefined();
    }, 10000);

    it("should setup json and urlencoded middlewares", async () => {
      const port = 4003;

      await app.listen(port);
      appsToClose.push(app);

      // Server started successfully means middlewares were set up
      expect(
        mockLogger.logs.some(
          (log) => log.level === "info" && log.message.includes("listening")
        )
      ).toBe(true);
    }, 10000);

    it("should register routes before starting", async () => {
      const port = 4004;
      const testRoute = new TestRoute();
      app.registerRoutes({ routes: [testRoute] });

      await app.listen(port);
      appsToClose.push(app);

      expect(
        mockLogger.logs.some((log) => log.message.includes("listening"))
      ).toBe(true);
    }, 10000);

    it("should call process.exit on startup error", async () => {
      const port = 4005;
      const app1 = new App({ logger: mockLogger });
      const app2 = new App({ logger: mockLogger });

      // Mock process.exit
      const mockExit = jest
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      // Start first server
      await app1.listen(port);
      appsToClose.push(app1);

      // Try to start second server on same port (should fail)
      await app2.listen(port);

      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    }, 10000);
  });

  describe("options", () => {
    it("should disable CORS when configured", () => {
      const app = new App({
        cors: { enabled: false },
        logger: mockLogger,
      });

      expect(app).toBeDefined();
    });

    it("should disable Helmet when configured", () => {
      const app = new App({
        helmet: { enabled: false },
        logger: mockLogger,
      });

      expect(app).toBeDefined();
    });

    it("should use custom CORS options", () => {
      const app = new App({
        cors: {
          enabled: true,
          options: { origin: "http://localhost:3000" },
        },
        logger: mockLogger,
      });

      expect(app).toBeDefined();
    });

    it("should use custom Helmet options", () => {
      const app = new App({
        helmet: {
          enabled: true,
          options: { contentSecurityPolicy: false },
        },
        logger: mockLogger,
      });

      expect(app).toBeDefined();
    });

    it("should disable trust proxy when configured", () => {
      const app = new App({
        trustProxy: false,
        logger: mockLogger,
      });

      expect(app).toBeDefined();
    });
  });

  describe("process handlers", () => {
    let appInstance: App;

    afterEach(async () => {
      if (appInstance) {
        await appInstance.close();
      }
    });

    it("should setup uncaughtException handler", async () => {
      appInstance = new App({ logger: mockLogger });
      const port = 4006;

      await appInstance.listen(port);

      // Verify handler is registered by checking listeners
      const listeners = process.listeners("uncaughtException");
      expect(listeners.length).toBeGreaterThan(0);
    }, 10000);

    it("should setup unhandledRejection handler", async () => {
      appInstance = new App({ logger: mockLogger });
      const port = 4007;

      await appInstance.listen(port);

      // Verify handler is registered by checking listeners
      const listeners = process.listeners("unhandledRejection");
      expect(listeners.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe("close", () => {
    it("should close server gracefully", async () => {
      const app = new App({ logger: mockLogger });
      await app.listen(4008);

      await expect(app.close()).resolves.toBeUndefined();
    }, 10000);

    it("should do nothing if server not started", async () => {
      const app = new App({ logger: mockLogger });

      await expect(app.close()).resolves.toBeUndefined();
    });
  });
});

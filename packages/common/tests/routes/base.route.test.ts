import { BaseRoute } from "../../lib/routes/base.route";
import { Request, Response, NextFunction, RequestHandler } from "express";

// Concrete implementation for testing abstract BaseRoute
class TestRoute extends BaseRoute {
  route = "test";

  constructor() {
    super();
    this.router.get("/", ((_req: Request, res: Response) => {
      res.json({ message: "test" });
    }) as RequestHandler);
  }
}

class NoRouteTestRoute extends BaseRoute {
  route = undefined;
}

describe("BaseRoute", () => {
  describe("router", () => {
    it("should create router instance", () => {
      const route = new TestRoute();

      expect(route.router).toBeDefined();
      expect(route.router).toBeInstanceOf(Function); // Router is a function
    });

    it("should allow adding routes to router", () => {
      const route = new TestRoute();

      // Router should have the GET route we added
      expect(route.router.stack.length).toBeGreaterThan(0);
    });

    it("should allow adding multiple routes", () => {
      class MultiRouteTest extends BaseRoute {
        route = "multi";

        constructor() {
          super();
          const handler: RequestHandler = (_req, res) => {
            res.json({ ok: true });
          };
          this.router.get("/", handler);
          this.router.post("/", handler);
        }
      }

      const route = new MultiRouteTest();

      expect(route.router.stack.length).toBe(2);
    });
  });

  describe("route property", () => {
    it("should have abstract route property", () => {
      const route = new TestRoute();

      expect(route.route).toBe("test");
    });

    it("should allow undefined route", () => {
      const route = new NoRouteTestRoute();

      expect(route.route).toBeUndefined();
    });

    it("should allow different route paths", () => {
      class UsersRoute extends BaseRoute {
        route = "users";
      }

      class ProductsRoute extends BaseRoute {
        route = "products";
      }

      const usersRoute = new UsersRoute();
      const productsRoute = new ProductsRoute();

      expect(usersRoute.route).toBe("users");
      expect(productsRoute.route).toBe("products");
    });

    it("should allow nested route paths", () => {
      class NestedRoute extends BaseRoute {
        route = "api/v1/nested";
      }

      const route = new NestedRoute();

      expect(route.route).toBe("api/v1/nested");
    });
  });

  describe("middleware support", () => {
    it("should support middleware on routes", () => {
      const middleware: RequestHandler = jest.fn((_req, _res, next) => next());

      class MiddlewareRoute extends BaseRoute {
        route = "middleware";

        constructor() {
          super();
          this.router.use(middleware);
        }
      }

      const route = new MiddlewareRoute();

      expect(route.router.stack.length).toBeGreaterThan(0);
    });

    it("should support route-specific middleware", () => {
      const authMiddleware: RequestHandler = jest.fn((_req, _res, next) => next());
      const handler: RequestHandler = (_req, res) => {
        res.json({ ok: true });
      };

      class ProtectedRoute extends BaseRoute {
        route = "protected";

        constructor() {
          super();
          this.router.get("/", authMiddleware, handler);
        }
      }

      const route = new ProtectedRoute();

      expect(route.router.stack.length).toBe(1);
    });
  });

  describe("router methods", () => {
    it("should support common HTTP methods", () => {
      class CommonMethodsRoute extends BaseRoute {
        route = "common-methods";

        constructor() {
          super();
          const handler: RequestHandler = (_req, res) => {
            res.json({ ok: true });
          };
          this.router.get("/", handler);
          this.router.post("/", handler);
        }
      }

      const route = new CommonMethodsRoute();

      expect(route.router.stack.length).toBe(2);
    });

    it("should support route parameters", () => {
      class ParamRoute extends BaseRoute {
        route = "items";

        constructor() {
          super();
          const handler: RequestHandler = (req, res) => {
            res.json({ id: req.params.id });
          };
          this.router.get("/:id", handler);
        }
      }

      const route = new ParamRoute();

      expect(route.router.stack.length).toBe(1);
    });
  });
});

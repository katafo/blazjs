import { Router } from "express";

export abstract class BaseRoute {
  abstract readonly route?: string;
  readonly router: Router = Router({});

  constructor() {
    this.registerRoutes();
  }

  protected abstract registerRoutes(): void;
}

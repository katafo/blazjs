import { Router } from "express";

export abstract class BaseRoute {
  abstract readonly route?: string;
  readonly router: Router = Router();
}

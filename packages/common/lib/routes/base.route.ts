import { Router } from "express";

export interface BaseRoute {
  route?: string;
  router: Router;
}

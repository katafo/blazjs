import { BaseRoute } from "./base.route";

export interface AppRoute {
  version?: string;
  groups?: {
    group?: string;
    routes: BaseRoute[];
  }[];
  routes?: BaseRoute[];
}

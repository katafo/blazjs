import { AppRoute } from "@blazjs/common";
import Container from "typedi";
import { UserRoute } from "../modules/users/user.route";

export const RouteV1: AppRoute = {
  version: "v1",
  routes: [UserRoute].map((route) => Container.get(route)),
};

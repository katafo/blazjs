import { App } from "@blazjs/common";
import { TypeOrmDataSource } from "@blazjs/datasource";
import { json, urlencoded } from "express";
import Container from "typedi";
import { AppConfig } from "./configs";
import { INJECT_SQL } from "./datasource";
import { RoutesVer1 } from "./routes.v1";

async function bootstrap() {
  Container.get(AppConfig).validate();
  await Container.get<TypeOrmDataSource>(INJECT_SQL).initialize();

  const app = new App({ trustProxy: true });
  app.registerRoutes(RoutesVer1);
  app.registerMiddlewares(json(), urlencoded({ extended: true }));
  app.sanitizeLogs(["password"]);

  await app.listen(3000);
}

bootstrap();

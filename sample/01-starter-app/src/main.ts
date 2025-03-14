import { App } from "@blazjs/common";
import Container from "typedi";
import { AppConfig } from "./configs";
import { AppDataSource } from "./datasource";
import { RoutesVer1 } from "./routes.v1";

async function bootstrap() {
  Container.get(AppConfig).validate();
  await Container.get(AppDataSource).initialize();

  const app = new App();
  app.registerRoutes(RoutesVer1);
  await app.listen(3000);
}

bootstrap();

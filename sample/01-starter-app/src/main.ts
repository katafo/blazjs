import { App } from "@blazjs/common";
import Container from "typedi";
import { AppConfig, AppDataSource, RouteV1 } from "./app";

async function bootstrap() {
  Container.get(AppConfig).validate();
  await Container.get(AppDataSource).initialize();

  const app = new App();
  app.registerRoutes(RouteV1);
  await app.listen(3000);
}

bootstrap();

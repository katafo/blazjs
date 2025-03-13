import { App } from "@blazjs/common";
import { TypeOrmDataSource } from "@blazjs/datasource";
import Container from "typedi";
import { AppConfig } from "./configs";
import { INJECT_SQL } from "./datasource";
import { RoutesVer1 } from "./routes.v1";

async function bootstrap() {
  Container.get(AppConfig).validate();

  const datasource = Container.get<TypeOrmDataSource>(INJECT_SQL);
  await datasource.initialize();

  const app = new App();
  app.registerRoutes(RoutesVer1);

  await app.listen(3000);
}

bootstrap();

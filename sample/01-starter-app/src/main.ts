import { App } from "@blazjs/common";
import { TypeOrmDataSource } from "@blazjs/datasource";
import { json, urlencoded } from "express";
import Container from "typedi";
import { AppConfig } from "./configs";
import { INJECT_SQL } from "./datasource";
import { RoutesVer1 } from "./routes.v1";

const bootstrap = () => {
  const app = new App();
  app.use(json(), urlencoded({ extended: true }));
  app.registerRoutes(RoutesVer1);

  app.listen(3000, async () => {
    // validate the configuration
    Container.get(AppConfig).validate();
    // initialize the data source
    await Container.get<TypeOrmDataSource>(INJECT_SQL).initialize();
  });
};

bootstrap();

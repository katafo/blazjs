import { App, Config } from "@blazjs/common";
import { TypeOrmDataSource } from "@blazjs/datasource";
import { plainToInstance } from "class-transformer";
import Container from "typedi";
import { AppConfig } from "./configs";
import { INJECT_SQL } from "./datasource";
import { UserRoute } from "./modules/users/user.route";

const config = Container.get(AppConfig);
const routes = [UserRoute];

const app = new App(config, [
  {
    version: "v1",
    routes: routes.map((route) => Container.get(route)),
  },
]);

app.start(async () => {
  // validate the configuration
  Config.validate(plainToInstance(AppConfig, config));

  // initialize the data source
  await Container.get<TypeOrmDataSource>(INJECT_SQL).initialize();
});

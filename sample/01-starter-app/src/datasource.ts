import { TypeOrmDataSource } from "@blazjs/datasource";
import Container from "typedi";
import { AppConfig } from "./configs";

const config = Container.get(AppConfig);
const { db } = config;
const path = config.isProductionNodeEnv() ? "dist/src" : "src";

export const INJECT_SQL = "SqlDataSource";

Container.set(
  INJECT_SQL,
  new TypeOrmDataSource({
    type: "mysql",
    entities: [path + "/**/*.entity.ts"],
    database: db.database,
    username: db.username,
    password: db.password,
    host: db.host,
    port: db.port,
    poolSize: 10,
    maxQueryExecutionTime: 1000,
    synchronize: false,
  })
);

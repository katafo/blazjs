import { TypeOrmDataSource } from "@blazjs/datasource";
import { Service } from "typedi";
import { AppConfig } from "./app.config";

@Service()
export class AppDataSource extends TypeOrmDataSource {
  constructor(config: AppConfig) {
    const { db } = config;
    super({
      type: "mysql",
      entities: ["src/**/*.entity.{ts,js}"],
      database: db.database,
      username: db.username,
      password: db.password,
      host: db.host,
      port: db.port,
      poolSize: 10,
      maxQueryExecutionTime: 1000,
      synchronize: false,
    });
  }
}

import { Config } from "@blazjs/common";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";
import { Service } from "typedi";
import { MySqlDataSourceConfig } from "./types/db.config";

@Service()
export class AppConfig extends Config {
  @ValidateNested()
  @Type(() => MySqlDataSourceConfig)
  db: MySqlDataSourceConfig;

  constructor() {
    super();
    this.db = this.decodeObj(process.env.DB);
  }
}

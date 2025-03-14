import { Config } from "@blazjs/common";
import { ValidateNested } from "class-validator";
import { Service } from "typedi";
import { MySqlDataSourceConfig } from "./configs/db.config";

@Service()
export class AppConfig extends Config {
  @ValidateNested()
  db: MySqlDataSourceConfig;

  constructor() {
    super();
    this.db = this.decodeObj(process.env.DB);
  }
}

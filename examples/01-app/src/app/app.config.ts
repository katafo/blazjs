import { Config } from "@blazjs/common";
import { ValidateNested } from "class-validator";
import { Service } from "typedi";
import { MySqlDataSourceConfig } from "./configs/db.config";
import { JwtConfig } from "./configs/jwt.config";

@Service()
export class AppConfig extends Config {
  @ValidateNested()
  db: MySqlDataSourceConfig;

  @ValidateNested()
  jwt: JwtConfig;

  constructor() {
    super();
    this.db = this.decodeObj(process.env.DB);
    this.jwt = this.decodeObj(process.env.JWT);
  }
}
